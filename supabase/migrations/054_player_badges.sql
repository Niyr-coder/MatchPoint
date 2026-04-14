-- Migration 054: Add player_badges table
-- Stores badge grants for players. Badge type is enforced at application layer.
-- club_id NULL means a global/platform-wide badge.
-- Two partial unique indexes handle NULL club_id correctly (PostgreSQL NULLs
-- are not equal in a standard UNIQUE constraint, so a single constraint cannot
-- prevent duplicate global badges).

CREATE TABLE IF NOT EXISTS public.player_badges (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_type TEXT        NOT NULL,
  club_id    UUID        REFERENCES public.clubs(id) ON DELETE CASCADE,
  granted_by UUID        NOT NULL REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.player_badges IS
  'Records badge grants to players. club_id IS NULL denotes platform-wide badges.';

-- Lookup index: fetch all badges for a user
CREATE INDEX IF NOT EXISTS idx_player_badges_user_id
  ON public.player_badges (user_id);

-- Lookup index: fetch all badges belonging to a club (partial — skips global badges)
CREATE INDEX IF NOT EXISTS idx_player_badges_club_id
  ON public.player_badges (club_id)
  WHERE club_id IS NOT NULL;

-- Uniqueness: one badge of each type per (user, club)
CREATE UNIQUE INDEX IF NOT EXISTS player_badges_unique_club
  ON public.player_badges (user_id, badge_type, club_id)
  WHERE club_id IS NOT NULL;

-- Uniqueness: one global badge of each type per user (club_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS player_badges_unique_global
  ON public.player_badges (user_id, badge_type)
  WHERE club_id IS NULL;

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.player_badges ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can view any badge (needed for public profile pages)
CREATE POLICY "player_badges_select_authenticated"
  ON public.player_badges
  FOR SELECT
  TO authenticated
  USING (true);

-- Only platform admins or club managers (verified via profiles/user_roles) may
-- INSERT / UPDATE / DELETE. Row-level writes are handled through server-side
-- API routes that run as service_role; no direct-client write policies are
-- opened here to avoid privilege escalation.
-- If a direct-insert policy is required later, scope it to:
--   granted_by = auth.uid() AND EXISTS (SELECT 1 FROM user_roles WHERE ...)

-- ── ROLLBACK (run manually if needed) ────────────────────────────────────────
-- DROP TABLE IF EXISTS public.player_badges CASCADE;
