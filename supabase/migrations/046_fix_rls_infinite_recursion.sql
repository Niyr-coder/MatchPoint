-- ============================================================
-- 046_fix_rls_infinite_recursion.sql
--
-- Root cause: circular RLS dependency introduced in migration 045.
--
--   events_select_invite_only_registered (on events)
--     → subquery on event_registrations
--
--   event_registrations_select_club_staff (on event_registrations)
--     → subquery on events
--
-- When the events page queries events joined with event_registrations(count),
-- PostgreSQL evaluates both RLS sets simultaneously → infinite recursion.
--
-- Fix: replace inline subqueries with SECURITY DEFINER helper functions.
--   SECURITY DEFINER executes with owner privileges, bypassing RLS on the
--   inner table and breaking the circular dependency.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.auth_user_has_registration(uuid);
--   DROP FUNCTION IF EXISTS public.auth_user_is_event_club_staff(uuid);
--   Then re-apply the original policies from migration 045.
-- ============================================================

-- ── Helper 1: does the current user have a registration for this event? ──────
-- Used by events_select_invite_only_registered.
-- SECURITY DEFINER skips RLS on event_registrations, preventing the cycle.

CREATE OR REPLACE FUNCTION public.auth_user_has_registration(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM  public.event_registrations
    WHERE event_id = p_event_id
      AND user_id  = auth.uid()
  );
$$;

-- ── Helper 2: is the current user a club owner/manager for this event? ───────
-- Used by event_registrations_select_club_staff.
-- SECURITY DEFINER skips RLS on events and club_members, preventing the cycle.

CREATE OR REPLACE FUNCTION public.auth_user_is_event_club_staff(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM  public.events       e
    JOIN  public.club_members cm ON cm.club_id = e.club_id
    WHERE e.id        = p_event_id
      AND cm.user_id  = auth.uid()
      AND cm.is_active = true
      AND cm.role IN ('owner', 'manager')
  );
$$;

-- ── Recreate events_select_invite_only_registered using helper ────────────────

DROP POLICY IF EXISTS "events_select_invite_only_registered" ON public.events;

CREATE POLICY "events_select_invite_only_registered"
  ON public.events
  FOR SELECT TO authenticated
  USING (
    status     = 'published'
    AND visibility = 'invite_only'
    AND public.auth_user_has_registration(id)
  );

-- ── Recreate event_registrations_select_club_staff using helper ───────────────

DROP POLICY IF EXISTS "event_registrations_select_club_staff" ON public.event_registrations;

CREATE POLICY "event_registrations_select_club_staff"
  ON public.event_registrations
  FOR SELECT TO authenticated
  USING (
    public.auth_user_is_event_club_staff(event_id)
  );
