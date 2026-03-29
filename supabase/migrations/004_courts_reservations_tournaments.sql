-- MATCHPOINT — Courts, Reservations, Tournaments & Events
-- Fase 1: Tablas funcionales del dashboard de jugador

-- ============================================================
-- 1. Enum: sport_type
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.sport_type AS ENUM ('futbol', 'padel', 'tenis', 'pickleball');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. Enum: reservation_status
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.reservation_status AS ENUM ('pending', 'confirmed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. Enum: invite_status
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 4. Enum: tournament_status
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.tournament_status AS ENUM ('draft', 'open', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 5. Enum: participant_status
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.participant_status AS ENUM ('registered', 'confirmed', 'eliminated', 'winner');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 6. Table: courts (canchas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.courts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id        UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  sport          public.sport_type NOT NULL,
  surface_type   TEXT,                      -- 'cemento', 'cesped', 'arcilla', etc.
  is_indoor      BOOLEAN NOT NULL DEFAULT false,
  price_per_hour NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS courts_club_id_idx ON public.courts(club_id);
CREATE INDEX IF NOT EXISTS courts_sport_idx ON public.courts(sport);

ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;

-- Lectura pública (cualquier usuario autenticado puede ver canchas activas)
CREATE POLICY "courts_select" ON public.courts
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Inserción solo para owners/managers del club (via service role en API)
CREATE POLICY "courts_insert_service" ON public.courts
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "courts_update_service" ON public.courts
  FOR UPDATE TO service_role
  USING (true);

-- ============================================================
-- 7. Table: court_schedules (horarios disponibles)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.court_schedules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id     UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Dom, 6=Sáb
  open_time    TIME NOT NULL,
  close_time   TIME NOT NULL
);

CREATE INDEX IF NOT EXISTS court_schedules_court_id_idx ON public.court_schedules(court_id);

ALTER TABLE public.court_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "court_schedules_select" ON public.court_schedules
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "court_schedules_insert_service" ON public.court_schedules
  FOR INSERT TO service_role WITH CHECK (true);

-- ============================================================
-- 8. Table: reservations (reservas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reservations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id     UUID NOT NULL REFERENCES public.courts(id) ON DELETE RESTRICT,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  status       public.reservation_status NOT NULL DEFAULT 'pending',
  total_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reservations_user_id_idx ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS reservations_court_id_idx ON public.reservations(court_id);
CREATE INDEX IF NOT EXISTS reservations_date_idx ON public.reservations(date);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Usuarios ven solo sus propias reservas
CREATE POLICY "reservations_select_own" ON public.reservations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Usuarios crean sus propias reservas
CREATE POLICY "reservations_insert_own" ON public.reservations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Usuarios actualizan sus propias reservas (cancelar)
CREATE POLICY "reservations_update_own" ON public.reservations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "reservations_service" ON public.reservations
  FOR ALL TO service_role USING (true);

-- ============================================================
-- 9. Table: reservation_invites (invitaciones)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reservation_invites (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id    UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  invited_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status            public.invite_status NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reservation_id, invited_user_id)
);

CREATE INDEX IF NOT EXISTS reservation_invites_invited_user_idx ON public.reservation_invites(invited_user_id);

ALTER TABLE public.reservation_invites ENABLE ROW LEVEL SECURITY;

-- El invitado ve sus invitaciones
CREATE POLICY "invites_select_own" ON public.reservation_invites
  FOR SELECT TO authenticated
  USING (invited_user_id = auth.uid());

CREATE POLICY "invites_insert_own" ON public.reservation_invites
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "invites_update_own" ON public.reservation_invites
  FOR UPDATE TO authenticated
  USING (invited_user_id = auth.uid());

CREATE POLICY "invites_service" ON public.reservation_invites
  FOR ALL TO service_role USING (true);

-- ============================================================
-- 10. Table: tournaments (torneos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tournaments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  created_by       UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name             TEXT NOT NULL,
  sport            public.sport_type NOT NULL,
  description      TEXT,
  max_participants INTEGER NOT NULL DEFAULT 16,
  start_date       DATE NOT NULL,
  end_date         DATE,
  status           public.tournament_status NOT NULL DEFAULT 'draft',
  entry_fee        NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tournaments_status_idx ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS tournaments_sport_idx ON public.tournaments(sport);
CREATE INDEX IF NOT EXISTS tournaments_created_by_idx ON public.tournaments(created_by);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Torneos abiertos/en_progreso son visibles para todos
CREATE POLICY "tournaments_select" ON public.tournaments
  FOR SELECT TO authenticated
  USING (status IN ('open', 'in_progress', 'completed'));

-- Cualquier usuario autenticado puede crear torneos
CREATE POLICY "tournaments_insert_own" ON public.tournaments
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Solo el creador puede actualizar
CREATE POLICY "tournaments_update_own" ON public.tournaments
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "tournaments_service" ON public.tournaments
  FOR ALL TO service_role USING (true);

-- ============================================================
-- 11. Table: tournament_participants (inscripciones)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tournament_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          public.participant_status NOT NULL DEFAULT 'registered',
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS tp_tournament_idx ON public.tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS tp_user_idx ON public.tournament_participants(user_id);

ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tp_select" ON public.tournament_participants
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "tp_insert_own" ON public.tournament_participants
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tp_update_own" ON public.tournament_participants
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "tp_service" ON public.tournament_participants
  FOR ALL TO service_role USING (true);

-- ============================================================
-- 12. Table: events (eventos oficiales MatchPoint)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  sport        public.sport_type,
  location     TEXT,
  city         TEXT,
  start_date   TIMESTAMPTZ NOT NULL,
  end_date     TIMESTAMPTZ,
  image_url    TEXT,
  is_featured  BOOLEAN NOT NULL DEFAULT false,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_start_date_idx ON public.events(start_date);
CREATE INDEX IF NOT EXISTS events_featured_idx ON public.events(is_featured) WHERE is_featured = true;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden ver eventos
CREATE POLICY "events_select" ON public.events
  FOR SELECT TO authenticated
  USING (true);

-- Solo service role inserta/edita eventos (son oficiales de MatchPoint)
CREATE POLICY "events_service" ON public.events
  FOR ALL TO service_role USING (true);

-- ============================================================
-- 13. Trigger: updated_at automático para reservations y tournaments
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
