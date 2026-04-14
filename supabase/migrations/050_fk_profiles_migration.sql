-- Migration 050: Migrate FK references from auth.users → public.profiles
--
-- Background: Several tables created in migrations 003, 004, 006, and 042
-- use auth.users(id) as the target for user foreign keys. This creates
-- problems:
--   1. JOINs in admin dashboards require auth-schema access (service role only).
--   2. RLS policies mix auth.uid() with profiles lookups — two sources of truth.
--   3. Cascade/SET NULL behaviour diverges: auth.users deletes happen in a
--      different transaction step than profile deletes.
--
-- All app-level user IDs come from auth.uid(), which is the same UUID as
-- auth.users.id and public.profiles.id (enforced by the new_user trigger).
-- Migrating to public.profiles is therefore safe as long as every auth.users
-- row has a corresponding profiles row (guaranteed by the trigger added in
-- migration 002).
--
-- Tables affected (with constraint names):
--   rankings            user_id          → rankings_user_id_fkey
--   coach_students      coach_user_id    → coach_students_coach_user_id_fkey
--   coach_students      student_user_id  → coach_students_student_user_id_fkey
--   coach_earnings      coach_user_id    → coach_earnings_coach_user_id_fkey
--   cash_register_entries user_id        → cash_register_entries_user_id_fkey
--   clubs               created_by       → clubs_created_by_fkey (re-set in 042)
--   tournaments         created_by       → tournaments_created_by_fkey (re-set in 042)
--   club_members        user_id          → club_members_user_id_fkey
--   reservations        user_id          → reservations_user_id_fkey
--   tournament_participants user_id      → tournament_participants_user_id_fkey
--   courts              created_by       → courts_created_by_fkey
--
-- All FK renames preserve ON DELETE behaviour from the original migration.
-- ============================================================


-- ──────────────────────────────────────────────────────────────────────────────
-- rankings.user_id
-- Original: REFERENCES auth.users(id) ON DELETE CASCADE
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.rankings
  DROP CONSTRAINT IF EXISTS rankings_user_id_fkey;

ALTER TABLE public.rankings
  ADD CONSTRAINT rankings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


-- ──────────────────────────────────────────────────────────────────────────────
-- coach_students.coach_user_id
-- Original: REFERENCES auth.users(id) ON DELETE CASCADE
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.coach_students
  DROP CONSTRAINT IF EXISTS coach_students_coach_user_id_fkey;

ALTER TABLE public.coach_students
  ADD CONSTRAINT coach_students_coach_user_id_fkey
  FOREIGN KEY (coach_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


-- ──────────────────────────────────────────────────────────────────────────────
-- coach_students.student_user_id
-- Original: REFERENCES auth.users(id) ON DELETE CASCADE
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.coach_students
  DROP CONSTRAINT IF EXISTS coach_students_student_user_id_fkey;

ALTER TABLE public.coach_students
  ADD CONSTRAINT coach_students_student_user_id_fkey
  FOREIGN KEY (student_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


-- ──────────────────────────────────────────────────────────────────────────────
-- coach_earnings.coach_user_id
-- Original: REFERENCES auth.users(id) ON DELETE CASCADE
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.coach_earnings
  DROP CONSTRAINT IF EXISTS coach_earnings_coach_user_id_fkey;

ALTER TABLE public.coach_earnings
  ADD CONSTRAINT coach_earnings_coach_user_id_fkey
  FOREIGN KEY (coach_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


-- ──────────────────────────────────────────────────────────────────────────────
-- cash_register_entries.user_id
-- Original: REFERENCES auth.users(id) ON DELETE CASCADE
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.cash_register_entries
  DROP CONSTRAINT IF EXISTS cash_register_entries_user_id_fkey;

ALTER TABLE public.cash_register_entries
  ADD CONSTRAINT cash_register_entries_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


-- ──────────────────────────────────────────────────────────────────────────────
-- clubs.created_by
-- Regression in 042: re-set to auth.users with ON DELETE SET NULL — fix here.
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.clubs
  DROP CONSTRAINT IF EXISTS clubs_created_by_fkey;

ALTER TABLE public.clubs
  ADD CONSTRAINT clubs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


-- ──────────────────────────────────────────────────────────────────────────────
-- tournaments.created_by
-- Regression in 042: re-set to auth.users with ON DELETE SET NULL — fix here.
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_created_by_fkey;

ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


-- ──────────────────────────────────────────────────────────────────────────────
-- club_members.user_id
-- Original (migration 003): REFERENCES auth.users(id)
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.club_members
  DROP CONSTRAINT IF EXISTS club_members_user_id_fkey;

ALTER TABLE public.club_members
  ADD CONSTRAINT club_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


-- ──────────────────────────────────────────────────────────────────────────────
-- reservations.user_id
-- Original (migration 004): REFERENCES auth.users(id)
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_user_id_fkey;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


-- ──────────────────────────────────────────────────────────────────────────────
-- tournament_participants.user_id
-- Original (migration 004): REFERENCES auth.users(id)
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.tournament_participants
  DROP CONSTRAINT IF EXISTS tournament_participants_user_id_fkey;

ALTER TABLE public.tournament_participants
  ADD CONSTRAINT tournament_participants_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


-- ──────────────────────────────────────────────────────────────────────────────
-- courts.created_by
-- Original (migration 004): REFERENCES auth.users(id)
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courts' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.courts DROP CONSTRAINT IF EXISTS courts_created_by_fkey;
    ALTER TABLE public.courts ADD CONSTRAINT courts_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;
