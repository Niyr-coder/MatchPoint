-- Migration 017: Write policies for match_results
--
-- Context:
--   match_results was created in 009 with two SELECT policies but no write
--   policies. Migration 015 intentionally notes that only service_role should
--   write match results to prevent self-reporting. The PATCH route handler at
--   src/app/api/tournaments/[id]/brackets/[matchId]/route.ts uses
--   createServiceClient() for all inserts, so the service_role INSERT path
--   already works (service_role bypasses RLS). What is missing is:
--
--   1. An explicit service_role policy on match_results (consistent with the
--      pattern used in 003 for clubs, club_members, role_permissions).
--   2. An authenticated UPDATE policy so tournament creators and club
--      owners/managers can correct results through the API without needing a
--      direct DB connection — mirrors the authorization check already enforced
--      at the application layer in the PATCH route.
--   3. An authenticated DELETE policy limited to global admins, for removing
--      erroneous records when no API endpoint for deletion exists yet.
--
-- Design decisions:
--   - Regular authenticated users (players) NEVER insert match results directly.
--     All player-facing writes go through the service_role API route.
--   - UPDATE is allowed for: the tournament creator OR a club owner/manager
--     of the club associated with the match result. Mirrors app-layer guard.
--   - DELETE is restricted to global admins (profiles.global_role = 'admin').
--     This is a safety valve; a future admin API route is expected to be the
--     primary deletion path.

-- ============================================================
-- Drop policies if they exist (idempotent)
-- ============================================================

DROP POLICY IF EXISTS "service_role_all_match_results"    ON public.match_results;
DROP POLICY IF EXISTS "tournament_staff_update_match_results" ON public.match_results;
DROP POLICY IF EXISTS "global_admin_delete_match_results" ON public.match_results;

-- ============================================================
-- 1. service_role: full access
--    Covers INSERT (primary write path from PATCH route),
--    UPDATE, and DELETE from internal backend operations.
--    Explicit policy is consistent with 003 pattern and
--    documents intent clearly in pg_policies catalog.
-- ============================================================
CREATE POLICY "service_role_all_match_results"
  ON public.match_results
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. authenticated UPDATE: tournament creator or club staff
--
--    Allows correction of score/result for a match result row
--    when the authenticated user is:
--      a) the creator of the tournament the result belongs to, OR
--      b) an active owner or manager in the club the result belongs to.
--
--    This mirrors the application-layer authorization check in
--    src/app/api/tournaments/[id]/brackets/[matchId]/route.ts
--    (tournament.created_by = user.id check, line 22).
--
--    club_id is nullable on match_results (club-less tournaments).
--    The club_members subquery only matches when club_id IS NOT NULL.
-- ============================================================
CREATE POLICY "tournament_staff_update_match_results"
  ON public.match_results
  FOR UPDATE
  TO authenticated
  USING (
    -- The user created the tournament this result belongs to
    event_id IN (
      SELECT id
      FROM public.tournaments
      WHERE created_by = auth.uid()
    )
    OR
    -- The user is an active owner or manager of the club
    (
      club_id IS NOT NULL
      AND club_id IN (
        SELECT cm.club_id
        FROM public.club_members cm
        WHERE cm.user_id = auth.uid()
          AND cm.is_active = true
          AND cm.role IN ('owner', 'manager')
      )
    )
  )
  WITH CHECK (
    -- Same conditions must hold after the update
    event_id IN (
      SELECT id
      FROM public.tournaments
      WHERE created_by = auth.uid()
    )
    OR
    (
      club_id IS NOT NULL
      AND club_id IN (
        SELECT cm.club_id
        FROM public.club_members cm
        WHERE cm.user_id = auth.uid()
          AND cm.is_active = true
          AND cm.role IN ('owner', 'manager')
      )
    )
  );

-- ============================================================
-- 3. authenticated DELETE: global admin only
--
--    Only platform-level admins (profiles.global_role = 'admin')
--    can delete match result rows. This matches the admin-check
--    pattern used across other sensitive tables and prevents
--    tournament creators from erasing their own history.
--
--    NOTE: When a dedicated admin API route is added, that route
--    should use createServiceClient() instead of relying on this
--    policy — this policy is a safety valve for direct DB access
--    via the Supabase dashboard or a future admin-only API.
-- ============================================================
CREATE POLICY "global_admin_delete_match_results"
  ON public.match_results
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND global_role = 'admin'
    )
  );

-- ============================================================
-- ROLLBACK (run manually if this migration must be reverted)
-- ============================================================
-- DROP POLICY IF EXISTS "service_role_all_match_results"        ON public.match_results;
-- DROP POLICY IF EXISTS "tournament_staff_update_match_results" ON public.match_results;
-- DROP POLICY IF EXISTS "global_admin_delete_match_results"     ON public.match_results;
