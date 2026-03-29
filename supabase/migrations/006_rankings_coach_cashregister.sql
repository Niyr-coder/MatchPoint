-- MATCHPOINT — Rankings, Coach Relations & Cash Register
-- Fase 0: Tablas auxiliares para nuevas páginas del dashboard

-- ============================================================
-- 1. Table: rankings (puntuaciones por deporte)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rankings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport      public.sport_type NOT NULL,
  score      INT NOT NULL DEFAULT 0,
  wins       INT NOT NULL DEFAULT 0,
  losses     INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, sport)
);

CREATE INDEX IF NOT EXISTS rankings_sport_score_idx ON public.rankings(sport, score DESC);
CREATE INDEX IF NOT EXISTS rankings_user_id_idx ON public.rankings(user_id);

ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rankings_select" ON public.rankings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "rankings_service" ON public.rankings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 2. Table: coach_students (relación entrenador-estudiante)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coach_students (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id          UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  sport            public.sport_type NOT NULL,
  started_at       DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (coach_user_id, student_user_id, club_id)
);

CREATE INDEX IF NOT EXISTS coach_students_coach_idx ON public.coach_students(coach_user_id);
CREATE INDEX IF NOT EXISTS coach_students_club_idx ON public.coach_students(club_id);

ALTER TABLE public.coach_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_students_select" ON public.coach_students
  FOR SELECT TO authenticated USING (coach_user_id = auth.uid() OR student_user_id = auth.uid());

CREATE POLICY "coach_students_service" ON public.coach_students
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 3. Table: coach_earnings (ganancias del coach por club)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coach_earnings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id        UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  amount         NUMERIC(10,2) NOT NULL,
  description    TEXT NOT NULL,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coach_earnings_coach_idx ON public.coach_earnings(coach_user_id, date DESC);
CREATE INDEX IF NOT EXISTS coach_earnings_club_idx ON public.coach_earnings(club_id);

ALTER TABLE public.coach_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_earnings_select" ON public.coach_earnings
  FOR SELECT TO authenticated USING (coach_user_id = auth.uid());

CREATE POLICY "coach_earnings_service" ON public.coach_earnings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 4. Table: cash_register_entries (movimientos de caja por club)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.cash_entry_type AS ENUM ('income', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.cash_register_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id        UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           public.cash_entry_type NOT NULL,
  amount         NUMERIC(10,2) NOT NULL,
  concept        TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'efectivo',
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cash_entries_club_date_idx ON public.cash_register_entries(club_id, created_at DESC);

ALTER TABLE public.cash_register_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_entries_service" ON public.cash_register_entries
  FOR ALL TO service_role USING (true) WITH CHECK (true);
