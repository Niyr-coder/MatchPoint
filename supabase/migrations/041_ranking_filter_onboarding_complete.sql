-- Migration 041: Only show players who completed onboarding in rankings
--
-- A player is "officially registered" once they finish onboarding
-- (onboarding_completed = true on profiles).  Before that, their profile
-- is incomplete and they should not appear in any ranking list.

DROP FUNCTION IF EXISTS public.get_global_rankings(INT);
DROP FUNCTION IF EXISTS public.get_sport_ranking_with_enrolled(TEXT, INT);

CREATE OR REPLACE FUNCTION public.get_global_rankings(p_limit INT DEFAULT 200)
RETURNS TABLE (
  user_id    UUID,
  username   TEXT,
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
    p.id                                   AS user_id,
    p.username,
    COALESCE(p.full_name, 'Jugador')       AS full_name,
    p.avatar_url,
    COALESCE(SUM(r.score), 0)::NUMERIC     AS score,
    COALESCE(SUM(r.wins),  0)::INT         AS wins,
    COALESCE(SUM(r.losses),0)::INT         AS losses
  FROM public.profiles p
  LEFT JOIN public.rankings r ON r.user_id = p.id
  WHERE p.onboarding_completed = true
  GROUP BY p.id, p.username, p.full_name, p.avatar_url, p.created_at
  ORDER BY score DESC, wins DESC, p.created_at ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_global_rankings(INT)
  TO authenticated, service_role, anon;


CREATE OR REPLACE FUNCTION public.get_sport_ranking_with_enrolled(
  p_sport TEXT,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  user_id    UUID,
  username   TEXT,
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
    p.username,
    p.full_name,
    p.avatar_url,
    COALESCE(r.score, 0)::NUMERIC  AS score,
    COALESCE(r.wins,  0)::INT      AS wins,
    COALESCE(r.losses,0)::INT      AS losses
  FROM (
    SELECT DISTINCT tp.user_id
    FROM   public.tournament_participants tp
    JOIN   public.tournaments t ON t.id = tp.tournament_id
    WHERE  t.sport = p_sport::public.sport_type

    UNION

    SELECT rk.user_id
    FROM   public.rankings rk
    WHERE  rk.sport = p_sport::public.sport_type
  ) enrolled_users
  JOIN public.profiles p
    ON  p.id = enrolled_users.user_id
    AND p.onboarding_completed = true
  LEFT JOIN public.rankings r
    ON  r.user_id = enrolled_users.user_id
    AND r.sport   = p_sport::public.sport_type
  ORDER BY score DESC, wins DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_sport_ranking_with_enrolled(TEXT, INT)
  TO authenticated, service_role, anon;
