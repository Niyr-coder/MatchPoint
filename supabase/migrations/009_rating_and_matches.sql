-- MATCHPOINT — Rating System & Match History
-- Fase 9: Sistema de rating oficial y historial de partidos

-- ============================================================
-- 1. Rating & ranking fields on profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rating DECIMAL(4,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS ranking_position INTEGER,
  ADD COLUMN IF NOT EXISTS matches_played INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS matches_won INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;

-- ============================================================
-- 2. Match results table (historial de partidos oficiales)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.match_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opponent_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  opponent_name TEXT,                        -- snapshot for deleted accounts
  event_id      UUID,                        -- tournament_id or event id
  event_type    TEXT NOT NULL DEFAULT 'tournament'
                  CHECK (event_type IN ('tournament', 'quedada', 'event')),
  event_name    TEXT NOT NULL,
  club_id       UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  sport         TEXT NOT NULL,
  modality      TEXT,                        -- singles, doubles, etc.
  result        TEXT NOT NULL
                  CHECK (result IN ('win', 'loss', 'draw')),
  score         TEXT,                        -- e.g. "6-4, 7-5" or "11-8"
  is_official   BOOLEAN NOT NULL DEFAULT false,
  rating_delta  DECIMAL(4,2) DEFAULT 0.00,   -- how much rating changed after this match
  played_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS match_results_player_idx  ON public.match_results(player_id, played_at DESC);
CREATE INDEX IF NOT EXISTS match_results_official_idx ON public.match_results(player_id, is_official);

-- ============================================================
-- 3. RLS policies
-- ============================================================
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view official match results" ON public.match_results
  FOR SELECT USING (is_official = true);

CREATE POLICY "Players can view all their own results" ON public.match_results
  FOR SELECT USING (player_id = auth.uid());
