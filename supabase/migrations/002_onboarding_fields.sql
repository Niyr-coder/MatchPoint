-- MATCHPOINT — Onboarding fields migration
-- Adds profile completion fields with first/last name support

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name         TEXT,
  ADD COLUMN IF NOT EXISTS last_name          TEXT,
  ADD COLUMN IF NOT EXISTS city               TEXT,
  ADD COLUMN IF NOT EXISTS province           TEXT,
  ADD COLUMN IF NOT EXISTS phone              TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth      DATE,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Allow service role to SELECT all profiles
CREATE POLICY "service_role_select_profiles"
  ON public.profiles FOR SELECT TO service_role USING (true);
