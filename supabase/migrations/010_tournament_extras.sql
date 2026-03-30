-- MATCHPOINT — Tournament Extras & Modalities
-- Fase 10: Campos adicionales para torneos enriquecidos

-- ============================================================
-- 1. New fields on tournaments table
-- ============================================================
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS club_id       UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS start_time    TIME,
  ADD COLUMN IF NOT EXISTS modality      TEXT,
  ADD COLUMN IF NOT EXISTS is_official   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS extras        JSONB NOT NULL DEFAULT '{}';

-- extras JSONB shape:
-- {
--   "sorteos":      { "enabled": true, "detail": "..." },
--   "premios":      { "enabled": true, "detail": "medallas y trofeos" },
--   "streaming":    { "enabled": false },
--   "fotografia":   { "enabled": false },
--   "arbitro":      { "enabled": true },     <-- marks tournament as official
--   "patrocinador": { "enabled": false, "name": "" }
-- }

-- Make max_participants optional (no longer required)
ALTER TABLE public.tournaments
  ALTER COLUMN max_participants DROP NOT NULL;

-- ============================================================
-- 2. Index for club-based tournament queries
-- ============================================================
CREATE INDEX IF NOT EXISTS tournaments_club_idx ON public.tournaments(club_id);
CREATE INDEX IF NOT EXISTS tournaments_official_idx ON public.tournaments(is_official);
