-- Migration 059: get_match_stats function
--
-- Aggregates tournament_brackets rows by player for a given tournament.
-- Returns one row per player with wins, losses, sets, points, streak, and
-- round-robin points (3 per win, 1 per loss).
--
-- Only completed non-bye matches are included.
-- Players with null player1_id or player2_id are excluded.

CREATE OR REPLACE FUNCTION get_match_stats(p_tournament_id uuid)
RETURNS TABLE (
  player_id         uuid,
  matches_played    int,
  wins              int,
  losses            int,
  sets_for          int,
  sets_against      int,
  points_scored     int,
  points_conceded   int,
  best_streak       int,
  round_robin_points int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH completed_matches AS (
    SELECT
      id,
      tournament_id,
      player1_id,
      player2_id,
      winner_id,
      score,
      created_at,
      SPLIT_PART(score, '-', 1)::int AS score_a,
      SPLIT_PART(score, '-', 2)::int AS score_b
    FROM tournament_brackets
    WHERE tournament_id = p_tournament_id
      AND status = 'completed'
      AND status <> 'bye'
      AND player1_id IS NOT NULL
      AND player2_id IS NOT NULL
      AND score IS NOT NULL
      AND score LIKE '%-%'
  ),
  player_matches AS (
    SELECT
      player1_id                          AS pid,
      id                                  AS match_id,
      created_at,
      score_a                             AS sf,
      score_b                             AS sa,
      (winner_id = player1_id)            AS won
    FROM completed_matches
    UNION ALL
    SELECT
      player2_id                          AS pid,
      id                                  AS match_id,
      created_at,
      score_b                             AS sf,
      score_a                             AS sa,
      (winner_id = player2_id)            AS won
    FROM completed_matches
  ),
  -- Gaps-and-islands: assign each row a group identifier for streak detection.
  -- Won rows that are contiguous share the same group.
  streaks AS (
    SELECT
      pid,
      match_id,
      won,
      ROW_NUMBER() OVER (PARTITION BY pid ORDER BY created_at)
        - ROW_NUMBER() OVER (PARTITION BY pid, won ORDER BY created_at) AS grp
    FROM player_matches
  ),
  win_streaks AS (
    SELECT
      pid,
      COUNT(*) AS streak_len
    FROM streaks
    WHERE won = true
    GROUP BY pid, grp
  ),
  best_streaks AS (
    SELECT
      pid,
      COALESCE(MAX(streak_len), 0)::int AS best_streak
    FROM win_streaks
    GROUP BY pid
  ),
  aggregated AS (
    SELECT
      pid,
      COUNT(*)::int                         AS matches_played,
      COUNT(*) FILTER (WHERE won)::int      AS wins,
      COUNT(*) FILTER (WHERE NOT won)::int  AS losses,
      COALESCE(SUM(sf), 0)::int             AS sets_for,
      COALESCE(SUM(sa), 0)::int             AS sets_against
    FROM player_matches
    GROUP BY pid
  )
  SELECT
    a.pid                                                     AS player_id,
    a.matches_played,
    a.wins,
    a.losses,
    a.sets_for,
    a.sets_against,
    a.sets_for                                                AS points_scored,
    a.sets_against                                            AS points_conceded,
    COALESCE(bs.best_streak, 0)                               AS best_streak,
    (a.wins * 3 + a.losses * 1)                               AS round_robin_points
  FROM aggregated a
  LEFT JOIN best_streaks bs ON bs.pid = a.pid;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'get_match_stats(%) failed: %', p_tournament_id, SQLERRM;
    RETURN;
END;
$$;

COMMENT ON FUNCTION get_match_stats(uuid) IS
  'Returns per-player match statistics for a tournament. Covers wins, losses, '
  'sets, points, best consecutive win streak, and round-robin standings points.';

-- ROLLBACK:
-- DROP FUNCTION IF EXISTS get_match_stats(uuid);
