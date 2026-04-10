-- Migration 034: Restrict profiles UPDATE policy (P3-A)
--
-- The "users_update_own_profile" policy allowed authenticated users to UPDATE
-- any column of their own profile row, including sensitive columns like
-- global_role and settings. An attacker could self-escalate privileges by
-- writing settings.suspended_from_role = 'admin' before being unsuspended.
--
-- All profile writes in the application already use createServiceClient()
-- (service role), so the authenticated UPDATE policy is unnecessary.
-- Dropping it removes the direct-client write vector entirely.
--
-- Phase 1 (migration 032d2bd7) fixed the unsuspend validation, but the root
-- cause (open UPDATE policy) was not addressed. This closes the gap.

DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
