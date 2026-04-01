-- Migration 024: Allow all authenticated users to read all profiles
--
-- Problem: The original SELECT policy on profiles uses auth.uid() = id, meaning
-- each user can only read their own profile row. This breaks ranking, member lists,
-- chat participant info, and any feature that needs to display other users' names/avatars.
--
-- Full_name and avatar_url are intentionally public within the platform (displayed in
-- rankings, tournament brackets, chat, etc.), so this is the correct data model.
--
-- The original restrictive policy is kept for UPDATE/DELETE (users can only modify their own).
-- We are only opening up SELECT.

CREATE POLICY "profiles_authenticated_read_all"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);
