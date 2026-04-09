-- Migration 032: Phase 2 — constraints, indexes, and triggers
--
-- Audit issues addressed:
--   C6  — notifications CHECK constraint missing 'announcement' type
--   C7  — coach_students / coach_earnings FK to auth.users → public.profiles
--   M1  — missing index: tournaments.club_id
--   M2  — missing index: coach_students.student_user_id
--   M3  — missing index: club_requests.status
--   M12 — updated_at triggers missing on clubs, club_members, club_requests, teams

-- ─────────────────────────────────────────────────────────────────────────────
-- C6: Notification type CHECK — add 'announcement'
-- The announcements API route inserts type='announcement', which was not in the
-- constraint added by migration 028, causing all bulk announcements to fail with
-- a CHECK violation.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'club_request_approved',
    'club_request_rejected',
    'team_invite',
    'system',
    'announcement'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- C7: Coach tables FK correction — auth.users → public.profiles
--
-- Supabase cannot resolve the PostgREST relationship hint
-- profiles!coach_students_student_user_id_fkey when the FK points to auth.users.
-- Changing to public.profiles is safe because profiles.id = auth.users.id by
-- construction (trigger handle_new_user in migration 001).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.coach_students
  DROP CONSTRAINT IF EXISTS coach_students_coach_user_id_fkey,
  DROP CONSTRAINT IF EXISTS coach_students_student_user_id_fkey;

ALTER TABLE public.coach_students
  ADD CONSTRAINT coach_students_coach_user_id_fkey
    FOREIGN KEY (coach_user_id)   REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT coach_students_student_user_id_fkey
    FOREIGN KEY (student_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.coach_earnings
  DROP CONSTRAINT IF EXISTS coach_earnings_coach_user_id_fkey;

ALTER TABLE public.coach_earnings
  ADD CONSTRAINT coach_earnings_coach_user_id_fkey
    FOREIGN KEY (coach_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- M1-M3: Missing indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- M1: tournaments.club_id — all dashboard club views filter tournaments by club
CREATE INDEX IF NOT EXISTS tournaments_club_id_idx
  ON public.tournaments (club_id);

-- M2: coach_students.student_user_id — reverse lookup: find a user's coaches
CREATE INDEX IF NOT EXISTS coach_students_student_idx
  ON public.coach_students (student_user_id);

-- M3: club_requests.status — admin review queue always filters by status
CREATE INDEX IF NOT EXISTS club_requests_status_idx
  ON public.club_requests (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- M12: updated_at triggers
--
-- These four tables have an updated_at column but no BEFORE UPDATE trigger to
-- keep it current. Without the trigger, the column only reflects the row's
-- creation time, not its last modification.
-- set_updated_at() was created in migration 004.
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS clubs_updated_at ON public.clubs;
CREATE TRIGGER clubs_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS club_members_updated_at ON public.club_members;
CREATE TRIGGER club_members_updated_at
  BEFORE UPDATE ON public.club_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS club_requests_updated_at ON public.club_requests;
CREATE TRIGGER club_requests_updated_at
  BEFORE UPDATE ON public.club_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS teams_updated_at ON public.teams;
CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
