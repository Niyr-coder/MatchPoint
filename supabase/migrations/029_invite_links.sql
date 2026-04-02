-- ============================================================
-- 029_invite_links.sql
-- Centralised invite-link system and event participation table.
--
-- Order: extensions → types → tables → indexes → triggers → RLS
--
-- Rollback (run to undo this migration):
--   DROP TABLE IF EXISTS public.event_registrations;
--   DROP TABLE IF EXISTS public.invite_links;
--   DROP FUNCTION IF EXISTS public.redeem_invite(TEXT);
--   DROP TYPE  IF EXISTS public.invite_entity_type;
-- ============================================================

-- ============================================================
-- 1. ENUM: invite_entity_type
--    Idempotent — silently skips if the type already exists.
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.invite_entity_type AS ENUM (
    'club',
    'tournament',
    'team',
    'event',
    'coach_class',
    'reservation'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.invite_entity_type
  IS 'Entities that can be targeted by a generic invite link.';

-- ============================================================
-- 2. TABLE: invite_links
--    Central registry for all shareable invite codes.
--    teams.invite_code is kept as-is (backward-compatible);
--    this table is additive.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invite_links (
  id          UUID                      PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT                      UNIQUE NOT NULL
                                          DEFAULT substr(md5(random()::text), 1, 10),
  entity_type public.invite_entity_type NOT NULL,
  entity_id   UUID                      NOT NULL,
  created_by  UUID                      NOT NULL
                                          REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_uses    INTEGER,                  -- NULL means unlimited
  uses_count  INTEGER                   NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ,              -- NULL means never expires
  is_active   BOOLEAN                   NOT NULL DEFAULT true,
  metadata    JSONB                     DEFAULT '{}',
  created_at  TIMESTAMPTZ               NOT NULL DEFAULT now(),

  CONSTRAINT invite_links_max_uses_positive
    CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT invite_links_uses_count_non_negative
    CHECK (uses_count >= 0)
);

COMMENT ON TABLE public.invite_links
  IS 'Generic invite links that can target clubs, tournaments, teams, events, coach classes, or reservations.';

COMMENT ON COLUMN public.invite_links.code
  IS '10-character URL-safe token used in share links.';
COMMENT ON COLUMN public.invite_links.max_uses
  IS 'Maximum allowed redemptions. NULL means unlimited.';
COMMENT ON COLUMN public.invite_links.expires_at
  IS 'Hard expiry timestamp. NULL means the link never expires.';
COMMENT ON COLUMN public.invite_links.metadata
  IS 'Arbitrary payload forwarded to the API after a successful redemption (e.g., role to assign).';

-- ============================================================
-- 3. INDEXES: invite_links
--    code is already covered by the UNIQUE constraint.
-- ============================================================

-- Lookups by entity (e.g. "all active invites for club X")
CREATE INDEX IF NOT EXISTS idx_invite_links_entity
  ON public.invite_links (entity_type, entity_id);

-- Lookups by creator (e.g. "show my invite links")
CREATE INDEX IF NOT EXISTS idx_invite_links_created_by
  ON public.invite_links (created_by);

-- Partial index for the common hot path: active, non-expired links
CREATE INDEX IF NOT EXISTS idx_invite_links_active
  ON public.invite_links (code)
  WHERE is_active = true;

-- ============================================================
-- 4. RLS: invite_links
-- ============================================================
ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users see active links OR their own links
CREATE POLICY "invite_links_select" ON public.invite_links
  FOR SELECT TO authenticated
  USING (
    is_active = true
    OR created_by = auth.uid()
  );

-- INSERT: any authenticated user can create invite links for themselves
CREATE POLICY "invite_links_insert" ON public.invite_links
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- UPDATE: only the creator can update (e.g. revoke) their own links
CREATE POLICY "invite_links_update" ON public.invite_links
  FOR UPDATE TO authenticated
  USING  (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- DELETE: only the creator can delete their own links
CREATE POLICY "invite_links_delete" ON public.invite_links
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Service role has unrestricted access (used by API routes)
CREATE POLICY "invite_links_service_role" ON public.invite_links
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 5. RPC: redeem_invite(p_code TEXT)
--    SECURITY DEFINER so it can increment uses_count atomically
--    without granting UPDATE to every authenticated user.
--    Returns the full invite_links row so the caller knows which
--    entity to process.
-- ============================================================
CREATE OR REPLACE FUNCTION public.redeem_invite(p_code TEXT)
RETURNS public.invite_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.invite_links;
BEGIN
  -- Lock the row to prevent concurrent over-redemption
  SELECT *
    INTO v_link
    FROM public.invite_links
   WHERE code = p_code
   FOR UPDATE;

  -- 1. Link must exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invite_not_found'
      USING HINT = 'The invite code does not exist.';
  END IF;

  -- 2. Link must be active
  IF NOT v_link.is_active THEN
    RAISE EXCEPTION 'invite_inactive'
      USING HINT = 'This invite link has been deactivated.';
  END IF;

  -- 3. Link must not be expired
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RAISE EXCEPTION 'invite_expired'
      USING HINT = 'This invite link has expired.';
  END IF;

  -- 4. Link must have remaining uses (when max_uses is set)
  IF v_link.max_uses IS NOT NULL AND v_link.uses_count >= v_link.max_uses THEN
    RAISE EXCEPTION 'invite_exhausted'
      USING HINT = 'This invite link has reached its maximum number of uses.';
  END IF;

  -- 5. Increment uses_count atomically
  UPDATE public.invite_links
     SET uses_count = uses_count + 1,
         -- Deactivate automatically when the last available use is consumed
         is_active  = CASE
                        WHEN max_uses IS NOT NULL AND (uses_count + 1) >= max_uses
                        THEN false
                        ELSE true
                      END
   WHERE id = v_link.id
  RETURNING * INTO v_link;

  RETURN v_link;

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise application-level exceptions unchanged; log unexpected ones
    IF SQLERRM IN ('invite_not_found', 'invite_inactive', 'invite_expired', 'invite_exhausted') THEN
      RAISE;
    END IF;
    RAISE WARNING 'redeem_invite: unexpected error for code=% — %', p_code, SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.redeem_invite(TEXT)
  IS 'Atomically validates and increments uses_count for an invite link. Raises descriptive exceptions on failure. Returns the updated invite_links row for downstream processing.';

-- ============================================================
-- 6. TABLE: event_registrations
--    Tracks which users have registered for an event.
--    events.created_by references auth.users — the "creator"
--    check in RLS uses a subquery against the events table.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID        NOT NULL REFERENCES public.events(id)   ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (event_id, user_id)
);

COMMENT ON TABLE public.event_registrations
  IS 'Participation records linking users to events they have registered for.';

CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id
  ON public.event_registrations (event_id);

CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id
  ON public.event_registrations (user_id);

-- ============================================================
-- 7. RLS: event_registrations
-- ============================================================
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- SELECT: a user can see their own registrations, or the event
--         creator can see all registrations for their event.
CREATE POLICY "event_registrations_select" ON public.event_registrations
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
        FROM public.events e
       WHERE e.id = event_registrations.event_id
         AND e.created_by = auth.uid()
    )
  );

-- INSERT: users can register themselves only
CREATE POLICY "event_registrations_insert" ON public.event_registrations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: not allowed through RLS (registrations are immutable;
--         use DELETE + INSERT if a change is needed)

-- DELETE: a user can unregister themselves; the event creator can
--         remove any registration for their event.
CREATE POLICY "event_registrations_delete" ON public.event_registrations
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
        FROM public.events e
       WHERE e.id = event_registrations.event_id
         AND e.created_by = auth.uid()
    )
  );

-- Service role has unrestricted access
CREATE POLICY "event_registrations_service_role" ON public.event_registrations
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
