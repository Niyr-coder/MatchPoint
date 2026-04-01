-- Migration 021: RLS SELECT/INSERT policies for cash_register_entries
--
-- The table was created in 006 with only a service_role ALL policy.
-- Routes currently use createServiceClient() so reads/writes work, but
-- authenticated users have no direct PostgREST access. Adding explicit
-- policies for defence-in-depth and consistency with other tables.
--
-- Rules:
--   SELECT — owner, manager, or employee of the club (they need to read
--             the register to build reports and the daily summary).
--   INSERT — employee or manager of the club (cashier role).
--             owner is excluded from direct inserts (they review, not operate).
--             In practice the route uses service_role, so this policy is a
--             safety net for future direct-access patterns.

DROP POLICY IF EXISTS "cash_entries_staff_select" ON public.cash_register_entries;
DROP POLICY IF EXISTS "cash_entries_staff_insert" ON public.cash_register_entries;

-- SELECT: owner, manager, employee of the same club
CREATE POLICY "cash_entries_staff_select"
  ON public.cash_register_entries
  FOR SELECT
  TO authenticated
  USING (
    club_id IN (
      SELECT cm.club_id
      FROM public.club_members cm
      WHERE cm.user_id   = auth.uid()
        AND cm.is_active = true
        AND cm.role IN ('owner', 'manager', 'employee')
    )
  );

-- INSERT: employee or manager of the club (cashier operations)
CREATE POLICY "cash_entries_staff_insert"
  ON public.cash_register_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND club_id IN (
      SELECT cm.club_id
      FROM public.club_members cm
      WHERE cm.user_id   = auth.uid()
        AND cm.is_active = true
        AND cm.role IN ('manager', 'employee')
    )
  );
