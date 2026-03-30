-- Allow creators to see their own tournaments regardless of status (fixes RLS on INSERT...RETURNING with draft status)
CREATE POLICY "tournaments_select_own" ON public.tournaments
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());
