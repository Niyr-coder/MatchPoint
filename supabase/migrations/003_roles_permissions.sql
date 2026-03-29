-- MATCHPOINT — Roles, Clubs & Permissions
-- 7-role authorization system with club-scoped membership

-- ============================================================
-- 1. Role enum
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'admin',
    'owner',
    'partner',
    'manager',
    'employee',
    'coach',
    'user'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. Permission enum
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.app_permission AS ENUM (
    -- Platform
    'platform.manage',
    'platform.view_analytics',
    -- Club management
    'club.create',
    'club.edit',
    'club.delete',
    'club.view',
    'club.suspend',
    -- Users & team
    'users.create',
    'users.edit',
    'users.view',
    'users.suspend',
    'team.manage',
    'coaches.create',
    'coaches.manage',
    -- Courts & schedules
    'courts.create',
    'courts.edit',
    'courts.view',
    'schedules.manage',
    -- Reservations
    'reservations.create',
    'reservations.cancel',
    'reservations.view',
    'reservations.checkin',
    -- Finance
    'finance.view_full',
    'finance.view_limited',
    'finance.cashier',
    'finance.export',
    -- Tournaments
    'tournaments.create',
    'tournaments.manage',
    'tournaments.view',
    -- Reports
    'reports.view_full',
    'reports.view_limited',
    'reports.create_daily',
    -- Config
    'config.edit',
    -- Content
    'leaderboard.view',
    'shop.purchase',
    'reviews.create',
    'chat.use'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. Clubs table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clubs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  address     TEXT,
  city        TEXT,
  province    TEXT,
  phone       TEXT,
  logo_url    TEXT,
  cover_url   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clubs_slug ON public.clubs (slug);
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. Club members (user ↔ club ↔ role)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.club_members (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id    UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL DEFAULT 'user',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, club_id, role)
);

CREATE INDEX IF NOT EXISTS idx_club_members_user ON public.club_members (user_id);
CREATE INDEX IF NOT EXISTS idx_club_members_club ON public.club_members (club_id);
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. Role → permissions mapping
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role       public.app_role NOT NULL,
  permission public.app_permission NOT NULL,
  UNIQUE (role, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. Add global_role to profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS global_role public.app_role NOT NULL DEFAULT 'user';

-- ============================================================
-- 7. Seed default role_permissions
-- ============================================================

-- ADMIN: everything
INSERT INTO public.role_permissions (role, permission)
SELECT 'admin', unnest(enum_range(NULL::public.app_permission))
ON CONFLICT DO NOTHING;

-- OWNER: club-level everything
INSERT INTO public.role_permissions (role, permission)
VALUES
  ('owner', 'club.create'), ('owner', 'club.edit'), ('owner', 'club.delete'), ('owner', 'club.view'),
  ('owner', 'users.create'), ('owner', 'users.edit'), ('owner', 'users.view'), ('owner', 'users.suspend'),
  ('owner', 'team.manage'), ('owner', 'coaches.create'), ('owner', 'coaches.manage'),
  ('owner', 'courts.create'), ('owner', 'courts.edit'), ('owner', 'courts.view'), ('owner', 'schedules.manage'),
  ('owner', 'reservations.create'), ('owner', 'reservations.cancel'), ('owner', 'reservations.view'), ('owner', 'reservations.checkin'),
  ('owner', 'finance.view_full'), ('owner', 'finance.cashier'), ('owner', 'finance.export'),
  ('owner', 'tournaments.create'), ('owner', 'tournaments.manage'), ('owner', 'tournaments.view'),
  ('owner', 'reports.view_full'), ('owner', 'reports.create_daily'),
  ('owner', 'config.edit'),
  ('owner', 'leaderboard.view'), ('owner', 'shop.purchase'), ('owner', 'reviews.create'), ('owner', 'chat.use')
ON CONFLICT DO NOTHING;

-- PARTNER: limited club access
INSERT INTO public.role_permissions (role, permission)
VALUES
  ('partner', 'club.view'),
  ('partner', 'finance.view_limited'),
  ('partner', 'reservations.create'), ('partner', 'reservations.view'),
  ('partner', 'tournaments.create'), ('partner', 'tournaments.manage'), ('partner', 'tournaments.view'),
  ('partner', 'reports.view_limited'),
  ('partner', 'leaderboard.view'), ('partner', 'shop.purchase'), ('partner', 'reviews.create'), ('partner', 'chat.use')
ON CONFLICT DO NOTHING;

-- MANAGER: operations
INSERT INTO public.role_permissions (role, permission)
VALUES
  ('manager', 'club.view'),
  ('manager', 'coaches.create'), ('manager', 'coaches.manage'),
  ('manager', 'courts.view'), ('manager', 'schedules.manage'),
  ('manager', 'reservations.create'), ('manager', 'reservations.cancel'), ('manager', 'reservations.view'), ('manager', 'reservations.checkin'),
  ('manager', 'finance.view_limited'), ('manager', 'finance.cashier'),
  ('manager', 'reports.view_full'), ('manager', 'reports.create_daily'),
  ('manager', 'leaderboard.view'), ('manager', 'chat.use')
ON CONFLICT DO NOTHING;

-- EMPLOYEE: daily ops
INSERT INTO public.role_permissions (role, permission)
VALUES
  ('employee', 'reservations.view'), ('employee', 'reservations.checkin'),
  ('employee', 'finance.cashier'),
  ('employee', 'reports.create_daily'),
  ('employee', 'chat.use')
ON CONFLICT DO NOTHING;

-- COACH: own schedule/students
INSERT INTO public.role_permissions (role, permission)
VALUES
  ('coach', 'reservations.create'), ('coach', 'reservations.view'),
  ('coach', 'tournaments.create'), ('coach', 'tournaments.view'),
  ('coach', 'leaderboard.view'),
  ('coach', 'reviews.create'), ('coach', 'chat.use')
ON CONFLICT DO NOTHING;

-- USER: player basics
INSERT INTO public.role_permissions (role, permission)
VALUES
  ('user', 'reservations.create'), ('user', 'reservations.view'),
  ('user', 'tournaments.create'), ('user', 'tournaments.view'),
  ('user', 'leaderboard.view'), ('user', 'shop.purchase'),
  ('user', 'reviews.create'), ('user', 'chat.use')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. RLS Policies
-- ============================================================

-- Clubs: anyone authenticated can view active clubs
CREATE POLICY "authenticated_view_clubs"
  ON public.clubs FOR SELECT TO authenticated
  USING (is_active = true);

-- Clubs: service role full access
CREATE POLICY "service_role_all_clubs"
  ON public.clubs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Club members: users can see their own memberships
CREATE POLICY "users_view_own_memberships"
  ON public.club_members FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Club members: service role full access
CREATE POLICY "service_role_all_club_members"
  ON public.club_members FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Role permissions: anyone authenticated can read
CREATE POLICY "authenticated_read_role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (true);

-- Role permissions: service role full access
CREATE POLICY "service_role_all_role_permissions"
  ON public.role_permissions FOR ALL TO service_role
  USING (true) WITH CHECK (true);
