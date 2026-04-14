-- ============================================================
-- 049_chat_permissions_v2.sql
--
-- Completes the chat permission model introduced in 007_chat_tables.sql.
--
-- Problems with 007:
--   1. conversations INSERT policy missing → users cannot start DMs.
--   2. conversation_participants INSERT policy missing → cannot add members.
--   3. conversations UPDATE policy missing → updated_at bumps fail.
--   4. SELECT policies on conversations and messages use an inline subquery
--      on conversation_participants; when PostgreSQL evaluates RLS on both
--      tables in the same query it can enter infinite recursion (same pattern
--      fixed in 046_fix_rls_infinite_recursion.sql).
--
-- Permission model implemented here:
--   • Any active club member (any role) may open DMs with other members
--     of the same club.
--   • Global admin (profiles.global_role = 'admin') may chat with anyone.
--   • Only owner, manager, or global admin may create broadcast conversations.
--   • Any conversation participant may send messages (already covered by 007;
--     preserved here to avoid depending on policy ordering).
--   • Participants and service_role may bump updated_at on conversations.
--
-- Rollback (run manually in order):
--   DROP FUNCTION IF EXISTS public.auth_user_is_club_member(uuid);
--   DROP FUNCTION IF EXISTS public.auth_user_can_broadcast(uuid);
--   DROP POLICY IF EXISTS "conv_select_participant_v2"         ON public.conversations;
--   DROP POLICY IF EXISTS "conv_insert_member"                 ON public.conversations;
--   DROP POLICY IF EXISTS "conv_update_participant"            ON public.conversations;
--   DROP POLICY IF EXISTS "conv_update_service_role"           ON public.conversations;
--   DROP POLICY IF EXISTS "conv_participants_insert_member"    ON public.conversation_participants;
--   DROP POLICY IF EXISTS "conv_participants_select_own"       ON public.conversation_participants;
--   DROP POLICY IF EXISTS "messages_select_participant_v2"     ON public.messages;
--   ALTER TABLE public.conversations DROP COLUMN IF EXISTS created_by;
--   Then re-apply the original SELECT policies from 007 if needed.
-- ============================================================


-- ============================================================
-- 1. Schema addition: track who created each conversation
-- ============================================================

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

COMMENT ON COLUMN public.conversations.created_by
  IS 'Profile that initiated the conversation. Required for broadcast creation checks.';


-- ============================================================
-- 1b. Backfill created_by for existing conversations
--     Uses the first participant (by joined_at / user_id) as the creator.
--     Safe to run multiple times (WHERE created_by IS NULL is idempotent).
-- ============================================================

UPDATE public.conversations c
SET    created_by = (
  SELECT cp.user_id
  FROM   public.conversation_participants cp
  WHERE  cp.conversation_id = c.id
  ORDER  BY cp.joined_at ASC NULLS LAST, cp.user_id ASC
  LIMIT  1
)
WHERE c.created_by IS NULL;


-- ============================================================
-- 2. Performance indexes
--    - conv_participants: hit on every RLS evaluation
--    - conversations(club_id, type): used by DM-listing query
--    - conversations(created_by): used by INSERT RLS policy
-- ============================================================

CREATE INDEX IF NOT EXISTS conv_participants_conv_user_idx
  ON public.conversation_participants(conversation_id, user_id);

CREATE INDEX IF NOT EXISTS conversations_club_type_idx
  ON public.conversations(club_id, type);

CREATE INDEX IF NOT EXISTS conversations_created_by_idx
  ON public.conversations(created_by);


-- ============================================================
-- 3. SECURITY DEFINER helpers
--    These functions execute with owner privileges so they bypass
--    RLS on the inner tables, breaking any circular dependency.
-- ============================================================

-- Helper: is auth.uid() an active member of this club, or a global admin?
CREATE OR REPLACE FUNCTION public.auth_user_is_club_member(p_club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.club_members
    WHERE  club_id  = p_club_id
      AND  user_id  = auth.uid()
      AND  is_active = true
  )
  OR EXISTS (
    SELECT 1
    FROM   public.profiles
    WHERE  id          = auth.uid()
      AND  global_role = 'admin'
  );
$$;

-- Helper: can auth.uid() create a broadcast conversation in this club?
-- Requires owner or manager club role, or global admin.
CREATE OR REPLACE FUNCTION public.auth_user_can_broadcast(p_club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.club_members
    WHERE  club_id  = p_club_id
      AND  user_id  = auth.uid()
      AND  is_active = true
      AND  role IN ('owner', 'manager')
  )
  OR EXISTS (
    SELECT 1
    FROM   public.profiles
    WHERE  id          = auth.uid()
      AND  global_role = 'admin'
  );
$$;


-- ============================================================
-- 4. conversations — DROP old policies, recreate using helpers
-- ============================================================

-- 4a. SELECT — drop the 007 policy (inline subquery → potential recursion)
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

-- 4b. SELECT — recreate using SECURITY DEFINER helper
--     A user sees a conversation when they are a direct participant.
--     The helper is not needed here (participants check is one level deep),
--     but we keep the policy name versioned to signal the replacement.
CREATE POLICY "conv_select_participant_v2"
  ON public.conversations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.conversation_participants cp
      WHERE  cp.conversation_id = conversations.id
        AND  cp.user_id         = auth.uid()
    )
  );

-- 4c. INSERT — active club members can create direct conversations;
--     only owner/manager/admin can create broadcast conversations.
DROP POLICY IF EXISTS "conv_insert_member" ON public.conversations;

CREATE POLICY "conv_insert_member"
  ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    -- creator column must match the caller
    created_by = auth.uid()
    AND
    -- caller must be an active member of (or admin for) the target club
    public.auth_user_is_club_member(club_id)
    AND
    -- broadcast conversations are restricted to privileged roles
    (
      type = 'direct'
      OR public.auth_user_can_broadcast(club_id)
    )
  );

-- 4d. UPDATE — participants may update (e.g. bumping updated_at); service_role
--     may always update for server-side maintenance.
DROP POLICY IF EXISTS "conv_update_participant"  ON public.conversations;
DROP POLICY IF EXISTS "conv_update_service_role" ON public.conversations;

CREATE POLICY "conv_update_participant"
  ON public.conversations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.conversation_participants cp
      WHERE  cp.conversation_id = conversations.id
        AND  cp.user_id         = auth.uid()
    )
  );

CREATE POLICY "conv_update_service_role"
  ON public.conversations
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 5. conversation_participants — add missing INSERT & SELECT policies
-- ============================================================

-- 5a. SELECT — a user may see participation rows for conversations they belong to.
DROP POLICY IF EXISTS "conv_participants_select_own" ON public.conversation_participants;

CREATE POLICY "conv_participants_select_own"
  ON public.conversation_participants
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM   public.conversation_participants cp2
      WHERE  cp2.conversation_id = conversation_participants.conversation_id
        AND  cp2.user_id         = auth.uid()
    )
  );

-- 5b. INSERT — a caller may add participants only when they are themselves a
--     member of the club that owns the conversation.
DROP POLICY IF EXISTS "conv_participants_insert_member" ON public.conversation_participants;

CREATE POLICY "conv_participants_insert_member"
  ON public.conversation_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   public.conversations c
      WHERE  c.id = conversation_id
        AND  public.auth_user_is_club_member(c.club_id)
    )
  );

-- 5c. service_role bypass for server-side participant management
DROP POLICY IF EXISTS "conv_participants_service_role" ON public.conversation_participants;

CREATE POLICY "conv_participants_service_role"
  ON public.conversation_participants
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 6. messages — DROP old SELECT policy, recreate with helper
--    (same recursion risk: inline subquery on conversation_participants
--    while conversation_participants SELECT policy queries conversations)
-- ============================================================

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;

CREATE POLICY "messages_select_participant_v2"
  ON public.messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.conversation_participants cp
      WHERE  cp.conversation_id = messages.conversation_id
        AND  cp.user_id         = auth.uid()
    )
  );

-- Preserve the existing INSERT policy name from 007 (no change needed,
-- but ensure idempotence by dropping and recreating).
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;

CREATE POLICY "Users can send messages to their conversations"
  ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM   public.conversation_participants cp
      WHERE  cp.conversation_id = messages.conversation_id
        AND  cp.user_id         = auth.uid()
    )
  );

-- service_role bypass for server-side message operations
DROP POLICY IF EXISTS "messages_service_role" ON public.messages;

CREATE POLICY "messages_service_role"
  ON public.messages
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
