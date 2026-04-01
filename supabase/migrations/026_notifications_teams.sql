-- ============================================================
-- 026_notifications_teams.sql
-- Creates the notifications, teams, and team_members tables
-- with RLS policies for user-scoped and service-role access.
-- ============================================================

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE public.notifications (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL, -- 'club_request_approved' | 'club_request_rejected' | 'team_invite' | 'system'
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  read        BOOLEAN     NOT NULL DEFAULT false,
  metadata    JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "notifications_user_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can only update (mark as read) their own notifications
CREATE POLICY "notifications_user_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Service role has unrestricted access (used by API routes to insert on behalf of users)
CREATE POLICY "notifications_service_role" ON public.notifications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TEAMS
-- ============================================================

CREATE TABLE public.teams (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT,
  sport       TEXT        CHECK (sport IN ('futbol', 'padel', 'tenis', 'pickleball')),
  club_id     UUID        REFERENCES public.clubs(id) ON DELETE SET NULL,
  created_by  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_code TEXT        UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.team_members (
  id        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id   UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role      TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('captain', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Teams: any authenticated user can view all active teams
CREATE POLICY "teams_select" ON public.teams
  FOR SELECT TO authenticated
  USING (true);

-- Teams: any authenticated user can create a team for themselves
CREATE POLICY "teams_insert" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Teams: only the captain of the team can update it
CREATE POLICY "teams_update" ON public.teams
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = teams.id
        AND user_id = auth.uid()
        AND role = 'captain'
    )
  );

-- Team members: any authenticated user can view all memberships
CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT TO authenticated
  USING (true);

-- Team members: users can only insert themselves
CREATE POLICY "team_members_insert" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Team members: a member can leave (delete self), or a captain can remove any member of their team
CREATE POLICY "team_members_delete" ON public.team_members
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'captain'
    )
  );

-- Service role full access for all team tables
CREATE POLICY "teams_service_role" ON public.teams
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "team_members_service_role" ON public.team_members
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
