-- ============================================================
-- 045_events_rls_fixes.sql
--
-- Fixes two RLS gaps in the events system:
--
--   1. invite_only events: registered users could not SELECT them
--      even though they already had a registration record.
--
--   2. event_registrations: platform admins and club staff had no
--      SELECT or DELETE policy — they were forced to use the
--      service role (bypassing RLS) to manage registrations.
--
-- Order: RLS policies only (no schema changes)
--
-- Rollback (run to undo this migration):
--   DROP POLICY IF EXISTS "events_select_invite_only_registered"  ON public.events;
--   DROP POLICY IF EXISTS "events_select_club_staff"              ON public.events;
--   DROP POLICY IF EXISTS "event_registrations_select_admin"      ON public.event_registrations;
--   DROP POLICY IF EXISTS "event_registrations_select_club_staff" ON public.event_registrations;
--   DROP POLICY IF EXISTS "event_registrations_delete_admin"      ON public.event_registrations;
--   DROP POLICY IF EXISTS "event_registrations_delete_club_staff" ON public.event_registrations;
-- ============================================================

-- ============================================================
-- FIX 1: invite_only events — registered users can SELECT them
--
-- The existing policies only let admins and the event creator see
-- invite_only events. A user who was already invited and holds a
-- registration record must also be able to see the event they
-- registered for.
-- ============================================================
DROP POLICY IF EXISTS "events_select_invite_only_registered" ON public.events;

CREATE POLICY "events_select_invite_only_registered"
  ON public.events
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND visibility = 'invite_only'
    AND EXISTS (
      SELECT 1 FROM public.event_registrations er
      WHERE er.event_id = events.id
        AND er.user_id  = auth.uid()
    )
  );

-- ============================================================
-- FIX 2: club staff can SELECT all events in their club
--
-- Owners and managers need to see draft, cancelled, and invite_only
-- events for their club (e.g. management dashboard, event list).
-- The existing "events_select_club_only_members" policy only covers
-- published + club_only events; this policy fills the rest.
-- ============================================================
DROP POLICY IF EXISTS "events_select_club_staff" ON public.events;

CREATE POLICY "events_select_club_staff"
  ON public.events
  FOR SELECT TO authenticated
  USING (
    club_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.club_members cm
      WHERE cm.user_id   = auth.uid()
        AND cm.club_id   = events.club_id
        AND cm.is_active = true
        AND cm.role IN ('owner', 'manager')
    )
  );

-- ============================================================
-- FIX 3: admins can SELECT all registrations
--
-- Platform admins need visibility into all registrations for
-- support, moderation, and reporting purposes.
-- ============================================================
DROP POLICY IF EXISTS "event_registrations_select_admin" ON public.event_registrations;

CREATE POLICY "event_registrations_select_admin"
  ON public.event_registrations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id          = auth.uid()
        AND p.global_role = 'admin'
    )
  );

-- ============================================================
-- FIX 4: club staff can SELECT registrations for their events
--
-- Owners and managers need to see who has registered for events
-- belonging to their club (attendance lists, capacity checks).
-- ============================================================
DROP POLICY IF EXISTS "event_registrations_select_club_staff" ON public.event_registrations;

CREATE POLICY "event_registrations_select_club_staff"
  ON public.event_registrations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM  public.events      e
      JOIN  public.club_members cm ON cm.club_id = e.club_id
      WHERE e.id           = event_registrations.event_id
        AND cm.user_id     = auth.uid()
        AND cm.is_active   = true
        AND cm.role IN ('owner', 'manager')
    )
  );

-- ============================================================
-- FIX 5: admins can DELETE registrations
--
-- Platform admins must be able to remove any registration for
-- moderation or data-correction purposes.
-- ============================================================
DROP POLICY IF EXISTS "event_registrations_delete_admin" ON public.event_registrations;

CREATE POLICY "event_registrations_delete_admin"
  ON public.event_registrations
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id          = auth.uid()
        AND p.global_role = 'admin'
    )
  );

-- ============================================================
-- FIX 6: club staff can DELETE registrations for their events
--
-- Owners and managers must be able to remove registrations for
-- events in their club (e.g. removing a no-show, freeing capacity).
-- ============================================================
DROP POLICY IF EXISTS "event_registrations_delete_club_staff" ON public.event_registrations;

CREATE POLICY "event_registrations_delete_club_staff"
  ON public.event_registrations
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM  public.events      e
      JOIN  public.club_members cm ON cm.club_id = e.club_id
      WHERE e.id           = event_registrations.event_id
        AND cm.user_id     = auth.uid()
        AND cm.is_active   = true
        AND cm.role IN ('owner', 'manager')
    )
  );
