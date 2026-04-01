-- MATCHPOINT — Profile settings column
-- Adds a JSONB column to persist user preferences across devices

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.settings IS
  'User preferences: notifications, appearance, privacy, language.';
