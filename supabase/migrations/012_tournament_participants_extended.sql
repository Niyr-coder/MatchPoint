-- Extend tournament_participants with payment and bracket fields
ALTER TABLE public.tournament_participants
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'waived')),
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seed INTEGER,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Brackets table for elimination rounds
CREATE TABLE IF NOT EXISTS public.tournament_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  player1_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  score TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'bye')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brackets_tournament_idx ON public.tournament_brackets(tournament_id, round);

ALTER TABLE public.tournament_brackets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brackets_select" ON public.tournament_brackets FOR SELECT TO authenticated USING (true);
CREATE POLICY "brackets_service" ON public.tournament_brackets FOR ALL TO service_role USING (true);
