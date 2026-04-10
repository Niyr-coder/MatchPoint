-- Migration 036: SQL-level aggregation RPCs
-- Q5: get_global_rankings — replaces 2-query JS merge in getRankingBySport(undefined)
-- Q6: get_club_clients    — replaces full-scan + JS groupBy in getClubClients()

-- ──────────────────────────────────────────────────────────────────────────────
-- Q5: Global rankings (all sports aggregated per user)
--
-- Replaces:
--   Promise.all([profiles.select(), rankings.select(limit=200)]) + JS merge
-- With:
--   Single SQL GROUP BY that sums score/wins/losses across all sports per user.
--   Returns only users who have at least one ranking entry (same as the sport
--   filter path).  Ordered server-side, no JS sort needed.
-- ──────────────────────────────────────────────────────────────────────────────
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
    r.user_id,
    p.full_name,
    p.avatar_url,
    SUM(r.score)::NUMERIC  AS score,
    SUM(r.wins)::INT       AS wins,
    SUM(r.losses)::INT     AS losses
  FROM public.rankings r
  JOIN public.profiles p ON p.id = r.user_id
  GROUP BY r.user_id, p.full_name, p.avatar_url
  ORDER BY score DESC, wins DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_global_rankings(INT) TO authenticated, anon;

-- ──────────────────────────────────────────────────────────────────────────────
-- Q6: Club clients (reservations aggregated per user for a given club)
--
-- Replaces:
--   reservations.select("user_id, date, courts!inner(club_id), profiles…")
--   + full scan of ALL reservations + JS Map groupBy
-- With:
--   Single SQL COUNT/GROUP BY joining courts for the club filter and profiles
--   for user details.  MAX(date) gives last_visit without loading every row.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_club_clients(p_club_id UUID)
RETURNS TABLE (
  user_id            UUID,
  full_name          TEXT,
  phone              TEXT,
  total_reservations BIGINT,
  last_visit         DATE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.user_id,
    p.full_name,
    p.phone,
    COUNT(r.id)      AS total_reservations,
    MAX(r.date)      AS last_visit
  FROM public.reservations r
  JOIN public.courts c      ON c.id = r.court_id AND c.club_id = p_club_id
  JOIN public.profiles p    ON p.id = r.user_id
  GROUP BY r.user_id, p.full_name, p.phone
  ORDER BY total_reservations DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_club_clients(UUID) TO authenticated;
