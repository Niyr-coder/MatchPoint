-- Migration 042: Fix FK constraints that block user deletion
--
-- Problem: tournaments.created_by has ON DELETE RESTRICT + NOT NULL.
-- When an admin tries to delete a user who created any tournament,
-- Supabase's auth.admin.deleteUser() fails because the constraint
-- prevents removing the auth.users row.
--
-- Fix: Change tournaments.created_by to nullable + ON DELETE SET NULL
-- so deleting a user orphans their tournaments (keeps the data) rather
-- than blocking the deletion.
--
-- Also covers club_requests.reviewed_by and permissions_roles.created_by
-- which default to NO ACTION (effectively RESTRICT on referenced row delete).

-- ── tournaments.created_by ─────────────────────────────────────────────────────
-- 1. Drop the existing FK (anonymous constraint, PostgreSQL names it based on table+col)
ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_created_by_fkey;

-- 2. Allow NULL (was NOT NULL — keep existing rows as-is, only future deletes affected)
ALTER TABLE public.tournaments
  ALTER COLUMN created_by DROP NOT NULL;

-- 3. Re-add FK with SET NULL so deleting a user keeps their tournaments
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── club_requests.reviewed_by ──────────────────────────────────────────────────
ALTER TABLE public.club_requests
  DROP CONSTRAINT IF EXISTS club_requests_reviewed_by_fkey;

ALTER TABLE public.club_requests
  ADD CONSTRAINT club_requests_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ── clubs.created_by (migration 003) ─────────────────────────────────────────
-- No explicit ON DELETE → defaults to NO ACTION (blocks deletion).
ALTER TABLE public.clubs
  DROP CONSTRAINT IF EXISTS clubs_created_by_fkey;

ALTER TABLE public.clubs
  ADD CONSTRAINT clubs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
