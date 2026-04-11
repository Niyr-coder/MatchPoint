-- Tournament feedback: players rate completed tournaments
CREATE TABLE IF NOT EXISTS public.tournament_feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT CHECK (char_length(comment) <= 500),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_feedback_tournament
  ON public.tournament_feedback (tournament_id);

ALTER TABLE public.tournament_feedback ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all feedback
CREATE POLICY "feedback_select" ON public.tournament_feedback
  FOR SELECT TO authenticated USING (true);

-- Only participants of a COMPLETED tournament can submit feedback
CREATE POLICY "feedback_insert" ON public.tournament_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tournament_participants tp
      JOIN public.tournaments t ON t.id = tp.tournament_id
      WHERE tp.tournament_id = tournament_feedback.tournament_id
        AND tp.user_id = auth.uid()
        AND tp.status != 'withdrawn'
        AND t.status = 'completed'
    )
  );

-- User can update their own feedback
CREATE POLICY "feedback_update" ON public.tournament_feedback
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- User can delete own; tournament creator can delete any
CREATE POLICY "feedback_delete" ON public.tournament_feedback
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_feedback.tournament_id
        AND t.created_by = auth.uid()
    )
  );
