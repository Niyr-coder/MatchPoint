-- MATCHPOINT — Pickleball Player Profiles
-- Migration 031: Adds pickleball-specific rating and player profile table.
-- Supports the Pickleball-First MVP pivot with DUPR-style ratings (1.0–8.0).

-- ============================================================
-- 1. Column: preferred_sport on profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_sport public.sport_type DEFAULT 'pickleball';

COMMENT ON COLUMN public.profiles.preferred_sport IS
  'The sport the user primarily plays. Defaults to pickleball for the MVP pivot.';

-- ============================================================
-- 2. Table: pickleball_profiles
-- One row per user. Stores DUPR-style ratings and player attributes.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pickleball_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- DUPR-style ratings: 1.0 (beginner) to 8.0 (pro). NULL until enough matches.
  singles_rating      DECIMAL(3,1) CHECK (singles_rating >= 1.0 AND singles_rating <= 8.0),
  doubles_rating      DECIMAL(3,1) CHECK (doubles_rating >= 1.0 AND doubles_rating <= 8.0),

  -- Confidence level 0–100; rises as more official matches are recorded.
  rating_confidence   INTEGER NOT NULL DEFAULT 0
                        CHECK (rating_confidence >= 0 AND rating_confidence <= 100),

  -- Player attributes
  skill_level         TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'pro')),
  dominant_hand       TEXT CHECK (dominant_hand IN ('right', 'left', 'ambidextrous')),
  play_style          TEXT CHECK (play_style IN ('singles', 'doubles', 'both')),
  preferred_position  TEXT CHECK (preferred_position IN ('left', 'right', 'both')),
  years_playing       INTEGER CHECK (years_playing >= 0),

  -- Self-reported initial rating before official matches exist.
  self_reported_level DECIMAL(3,1)
                        CHECK (self_reported_level >= 1.0 AND self_reported_level <= 8.0),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id)
);

COMMENT ON TABLE public.pickleball_profiles IS
  'DUPR-style rating and player attributes for pickleball players. One row per user.';

-- ============================================================
-- 3. Indexes
-- ============================================================

-- FK index (required for JOIN and CASCADE operations)
CREATE INDEX IF NOT EXISTS idx_pickleball_profiles_user_id
  ON public.pickleball_profiles (user_id);

-- Ranking queries: order players by singles rating descending
CREATE INDEX IF NOT EXISTS idx_pickleball_profiles_singles_rating
  ON public.pickleball_profiles (singles_rating DESC NULLS LAST);

-- Ranking queries: order players by doubles rating descending
CREATE INDEX IF NOT EXISTS idx_pickleball_profiles_doubles_rating
  ON public.pickleball_profiles (doubles_rating DESC NULLS LAST);

-- Partial index on rankings table for pickleball-specific leaderboard queries
CREATE INDEX IF NOT EXISTS idx_rankings_pickleball
  ON public.rankings (score DESC)
  WHERE sport = 'pickleball';

-- ============================================================
-- 4. Trigger: keep updated_at current on pickleball_profiles
-- Reuses the set_updated_at() function defined in migration 004.
-- ============================================================
DROP TRIGGER IF EXISTS pickleball_profiles_updated_at ON public.pickleball_profiles;
CREATE TRIGGER pickleball_profiles_updated_at
  BEFORE UPDATE ON public.pickleball_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 5. RLS Policies
-- ============================================================
ALTER TABLE public.pickleball_profiles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read pickleball profiles (public ranking).
CREATE POLICY "pickleball_profiles_select" ON public.pickleball_profiles
  FOR SELECT TO authenticated
  USING (true);

-- A user may only insert their own profile row.
CREATE POLICY "pickleball_profiles_insert" ON public.pickleball_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- A user may only update their own profile row.
-- Rating fields (singles_rating, doubles_rating, rating_confidence) should be
-- updated exclusively through service_role to prevent self-inflation; the API
-- layer is responsible for enforcing that restriction.
CREATE POLICY "pickleball_profiles_update" ON public.pickleball_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Service role has unrestricted access (used by background jobs and API routes).
CREATE POLICY "pickleball_profiles_service" ON public.pickleball_profiles
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- ROLLBACK (run manually if this migration needs to be reverted)
-- ============================================================
-- DROP TRIGGER IF EXISTS pickleball_profiles_updated_at ON public.pickleball_profiles;
-- DROP TABLE IF EXISTS public.pickleball_profiles;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS preferred_sport;
-- DROP INDEX IF EXISTS idx_rankings_pickleball;
