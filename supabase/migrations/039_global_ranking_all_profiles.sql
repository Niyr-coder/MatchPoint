-- Migration 039: Global ranking shows ALL registered users
--
-- Problem: get_global_rankings (migration 038) only shows users enrolled in
-- tournaments OR with a rankings entry. New users who haven't joined any
-- tournament are completely invisible.
--
-- Fix: Use profiles as the base table so every registered user appears.
-- Users with no ranking entries show score=0, wins=0, losses=0.
-- Ordered by score DESC, wins DESC — ties among new users are resolved by
-- join date (created_at ASC) so the list is deterministic.

CREATE OR REPLACE FUNCTION public.get_global_rankings(p_limit INT DEFAULT 200)
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
    p.id                                   AS user_id,
    COALESCE(p.full_name, 'Jugador')       AS full_name,
    p.avatar_url,
    COALESCE(SUM(r.score), 0)::NUMERIC     AS score,
    COALESCE(SUM(r.wins),  0)::INT         AS wins,
    COALESCE(SUM(r.losses),0)::INT         AS losses
  FROM public.profiles p
  LEFT JOIN public.rankings r ON r.user_id = p.id
  GROUP BY p.id, p.full_name, p.avatar_url, p.created_at
  ORDER BY score DESC, wins DESC, p.created_at ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_global_rankings(INT)
  TO authenticated, service_role, anon;
