-- Migration 058: RLS audit hardening
--
-- Findings from 2026-04-17 audit:
--
-- 1. tournament_participants — guest rows (user_id IS NULL):
--    - tp_insert_own: WITH CHECK (user_id = auth.uid()) intentionally blocks
--      guest inserts from the authenticated role. Guest participants MUST be
--      inserted via service_role (createServiceClient). This is already the
--      pattern in POST /api/tournaments/[id]/participants.
--    - tp_update_own: USING (user_id = auth.uid()) intentionally blocks guest
--      updates from the authenticated role. Guest row updates MUST use service_role.
--    - tp_select: USING (true) — all authenticated can read all participants,
--      including guest rows. Organizer correctly sees guests in their quedada.
--    ACTION: No policy changes needed. Comment added for future engineers.
--
-- 2. audit_log — correctly locked: SELECT only for admin, ALL for service_role.
--    No authenticated user can INSERT, UPDATE, or DELETE audit log entries directly.
--    ACTION: None.
--
-- 3. notifications — correctly locked: SELECT + UPDATE for owner (auth.uid() = user_id),
--    ALL for service_role, no INSERT for authenticated.
--    ACTION: None.
--
-- 4. tournament_brackets — brackets_select USING (true) covers both regular
--    tournament brackets and quedada rotation history (round=0 rows). Correct.
--    ACTION: None.
--
-- 5. quedada organizer UPDATE on own tournament:
--    tournaments_update_own: USING (created_by = auth.uid()) — organizer can
--    update their own tournament/quedada row. Correct.
--    ACTION: None.
--
-- ACTUAL CHANGE: Add explicit organizer-scoped DELETE policy for quedada
-- participants, so organizers can remove guests via auth client without needing
-- service_role for this specific operation.
-- (Currently organizer cannot DELETE a guest participant they mistakenly added
-- via any auth-client call — they need service_role or a backend route.)

-- Allow organizer to delete participants from their own quedada/tournament
-- This covers removing a mistakenly added guest (user_id IS NULL won't match
-- user_id = auth.uid(), so we check tournament ownership instead).
DROP POLICY IF EXISTS "tp_delete_organizer" ON public.tournament_participants;

CREATE POLICY "tp_delete_organizer"
  ON public.tournament_participants
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id
        AND t.created_by = auth.uid()
    )
  );

-- Service role catch-all (already exists via tp_service but document explicitly)
-- No change — tp_service FOR ALL TO service_role USING (true) already covers DELETE.
