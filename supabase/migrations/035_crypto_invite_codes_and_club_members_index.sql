-- Migration 035: Cryptographic invite codes + composite index on club_members
-- Q2: Replace md5(random()) with gen_random_uuid() for invite codes
-- Q7: Add composite index on club_members(club_id, is_active, role)

-- ──────────────────────────────────────────────────────────────────────────────
-- Q2a: Fix invite_links.code default — md5(random()) gives ~40-bit entropy
--       from a non-cryptographic PRNG.  gen_random_uuid() gives 122 bits from
--       the OS CSPRNG (pgcrypto/os-level).  We keep only 21 chars to stay URL-
--       friendly while still providing far more entropy than the previous 10.
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.invite_links
  ALTER COLUMN code
    SET DEFAULT replace(gen_random_uuid()::text, '-', '');

-- Q2b: Fix teams.invite_code default — same issue
ALTER TABLE public.teams
  ALTER COLUMN invite_code
    SET DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

-- Rotate any existing codes that were generated with the weak PRNG
-- (safe: existing invite links will get new codes; any in-flight links expire naturally)
UPDATE public.invite_links
  SET code = replace(gen_random_uuid()::text, '-', '')
  WHERE length(code) = 10;  -- old md5 codes were exactly 10 chars

UPDATE public.teams
  SET invite_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
  WHERE length(invite_code) = 8;  -- old md5 codes were exactly 8 chars

-- ──────────────────────────────────────────────────────────────────────────────
-- Q7: Composite index on club_members for common access patterns:
--   • getClubTeam: WHERE club_id = ? AND role != 'user'
--   • getClubClients / member lookups: WHERE club_id = ? AND is_active = true
--   • Role-level queries: WHERE club_id = ? AND is_active = true AND role = ?
-- ──────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_club_members_club_active_role
  ON public.club_members (club_id, is_active, role);
