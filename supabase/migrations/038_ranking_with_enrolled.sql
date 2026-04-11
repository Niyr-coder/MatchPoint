-- Migration 038: Ranking queries that include tournament-enrolled players
--
-- Problem: get_global_rankings only shows users with a rankings table entry
-- (i.e. players who have already played a match). Players who enrolled in a
-- tournament but haven't played yet are invisible.
--
-- Fix: UNION enrolled tournament participants with existing ranking entries,
-- so every registered player appears (with score=0 if they haven't played yet).

-- ── Sport-specific ranking with enrolled players ──────────────────────────────
CREATE OR REPLACE FUNCTION public.get_sport_ranking_with_enrolled(
  p_sport TEXT,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  user_id    UUID,
  full_name  TEXT,
  avatar_url TEXT,
  score      NUMERIC,
  wins       INT,
  losses     INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id                           AS user_id,
    p.full_name,
    p.avatar_url,
    COALESCE(r.score, 0)::NUMERIC  AS score,
    COALESCE(r.wins,  0)::INT      AS wins,
    COALESCE(r.losses,0)::INT      AS losses
  FROM (
    -- Players enrolled in any tournament of this sport
    SELECT DISTINCT tp.user_id
    FROM   public.tournament_participants tp
    JOIN   public.tournaments t ON t.id = tp.tournament_id
    WHERE  t.sport = p_sport::public.sport_type

    UNION

    -- Players who already have a ranking entry for this sport
    SELECT rk.user_id
    FROM   public.rankings rk
    WHERE  rk.sport = p_sport::public.sport_type
  ) enrolled_users
  JOIN public.profiles p ON p.id = enrolled_users.user_id
  LEFT JOIN public.rankings r
    ON  r.user_id = enrolled_users.user_id
    AND r.sport   = p_sport::public.sport_type
  ORDER BY score DESC, wins DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_sport_ranking_with_enrolled(TEXT, INT)
  TO authenticated, service_role, anon;

-- ── Global ranking with enrolled players ─────────────────────────────────────
-- Replaces get_global_rankings: now includes every player enrolled in at least
-- one tournament (not only those who have a rankings row).
CREATE OR REPLACE FUNCTION public.get_global_rankings(p_limit INT DEFAULT 50)
RETURNS TABLE (
  user_id    UUID,
  full_name  TEXT,
  avatar_url TEXT,
  score      NUMERIC,
  wins       INT,
  losses     INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id                                  AS user_id,
    p.full_name,
    p.avatar_url,
    COALESCE(SUM(r.score), 0)::NUMERIC   AS score,
    COALESCE(SUM(r.wins),  0)::INT        AS wins,
    COALESCE(SUM(r.losses),0)::INT        AS losses
  FROM (
    -- All players enrolled in any tournament
    SELECT DISTINCT tp.user_id
    FROM   public.tournament_participants tp

    UNION

    -- All players with any ranking entry
    SELECT rk.user_id
    FROM   public.rankings rk
  ) enrolled_users
  JOIN public.profiles p ON p.id = enrolled_users.user_id
  LEFT JOIN public.rankings r ON r.user_id = enrolled_users.user_id
  GROUP BY p.id, p.full_name, p.avatar_url
  ORDER BY score DESC, wins DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_global_rankings(INT)
  TO authenticated, service_role, anon;
