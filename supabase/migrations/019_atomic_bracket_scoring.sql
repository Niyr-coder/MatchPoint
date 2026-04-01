-- Migration 019: Atomic bracket match scoring
--
-- Context:
--   src/app/api/tournaments/[id]/brackets/[matchId]/route.ts (PATCH) executes
--   7+ sequential writes without a transaction:
--     1. UPDATE tournament_brackets (winner_id, score, status='completed')
--     2. UPDATE tournaments (bracket_locked=true)
--     3. INSERT match_results x2 (winner row + loser row)
--     4. SELECT profiles for winner and loser
--     5. UPDATE profiles.rating / matches_played / matches_won
--     6. SELECT rankings for winner and loser
--     7. UPSERT rankings x2
--     8. SELECT next bracket match
--     9. UPDATE tournament_brackets (advance winner to next slot)
--
--   Two failure modes:
--     a) Partial failure: any step after step 1 fails → bracket row says
--        'completed' but ratings/rankings are never updated (silent divergence).
--     b) Race condition: two concurrent requests for matches played by the same
--        player both read the profile rating before either write lands, causing
--        one delta to be silently overwritten (lost update).
--
-- Solution:
--   A single SECURITY DEFINER function that wraps the entire sequence inside
--   one implicit PostgreSQL transaction. Profile rows for winner and loser are
--   locked with SELECT … FOR UPDATE before any computation, serialising
--   concurrent calls that share a player. If any step raises an exception the
--   whole transaction rolls back automatically.
--
-- Rating formula (replicates RATING_WIN_DELTA / RATING_LOSS_DELTA constants):
--   winner: rating = LEAST(9.99, GREATEST(0, old_rating + 0.25))
--   loser:  rating = LEAST(9.99, GREATEST(0, old_rating - 0.15))
--   Applied only when p_is_official = true (matches route behaviour).
--
-- Rankings scoring (replicates route behaviour):
--   winner: wins += 1, score += 3
--   loser:  losses += 1, score = GREATEST(0, score - 1)
--
-- Caller contract (TypeScript, serviceClient):
--   const { data, error } = await serviceClient.rpc('score_bracket_match', {
--     p_match_id:      matchId,
--     p_tournament_id: tournamentId,
--     p_winner_id:     winnerId,
--     p_loser_id:      loserId,
--     p_winner_score:  winnerScore,
--     p_loser_score:   loserScore,
--     p_sport:         tournament.sport,
--     p_is_official:   tournament.is_official ?? false,
--   })
--   Returns one row: { bracket_updated, next_match_id, winner_new_rating, loser_new_rating }
--   next_match_id is NULL when the scored match is the final or no bracket slot
--   exists for the next round.

-- ============================================================
-- Function
-- ============================================================

CREATE OR REPLACE FUNCTION public.score_bracket_match(
  p_match_id       UUID,
  p_tournament_id  UUID,
  p_winner_id      UUID,
  p_loser_id       UUID,
  p_winner_score   INT,
  p_loser_score    INT,
  p_sport          TEXT,
  p_is_official    BOOLEAN DEFAULT false
)
RETURNS TABLE(
  bracket_updated   BOOLEAN,
  next_match_id     UUID,
  winner_new_rating INT,
  loser_new_rating  INT
)
LANGUAGE plpgsql
SECURITY DEFINER
-- Pin search_path to prevent search-path hijacking.
SET search_path = public
AS $$
DECLARE
  v_match           RECORD;
  v_winner_profile  RECORD;
  v_loser_profile   RECORD;
  v_winner_ranking  RECORD;
  v_loser_ranking   RECORD;
  v_next_match_id   UUID;
  v_next_round      INT;
  v_next_match_num  INT;
  v_slot            TEXT;
  v_score_text      TEXT;
  v_winner_new_rat  NUMERIC(4,2);
  v_loser_new_rat   NUMERIC(4,2);

  -- Rating deltas — keep in sync with RATING_WIN_DELTA / RATING_LOSS_DELTA in route.ts
  c_win_delta   CONSTANT NUMERIC(4,2) := 0.25;
  c_loss_delta  CONSTANT NUMERIC(4,2) := 0.15;   -- subtracted below, not added
BEGIN
  -- ------------------------------------------------------------------
  -- 1. Validate inputs.
  -- ------------------------------------------------------------------
  IF p_match_id IS NULL OR p_tournament_id IS NULL THEN
    RAISE EXCEPTION 'p_match_id and p_tournament_id are required'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_winner_id IS NULL OR p_loser_id IS NULL THEN
    RAISE EXCEPTION 'p_winner_id and p_loser_id are required'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_winner_id = p_loser_id THEN
    RAISE EXCEPTION 'winner and loser must be different players'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- ------------------------------------------------------------------
  -- 2. Fetch and validate the bracket match.
  -- ------------------------------------------------------------------
  SELECT id, round, match_number, player1_id, player2_id, status
  INTO v_match
  FROM public.tournament_brackets
  WHERE id            = p_match_id
    AND tournament_id = p_tournament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bracket match % not found in tournament %', p_match_id, p_tournament_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_match.status = 'completed' THEN
    RAISE EXCEPTION 'Este partido ya tiene resultado registrado'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Winner must be one of the two registered players.
  IF p_winner_id <> v_match.player1_id AND p_winner_id <> v_match.player2_id THEN
    RAISE EXCEPTION 'El ganador debe ser uno de los participantes del partido'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_loser_id <> v_match.player1_id AND p_loser_id <> v_match.player2_id THEN
    RAISE EXCEPTION 'El perdedor debe ser uno de los participantes del partido'
      USING ERRCODE = 'check_violation';
  END IF;

  -- ------------------------------------------------------------------
  -- 3. Lock profile rows for winner and loser (eliminates race condition
  --    when two matches involving the same player are scored concurrently).
  --    Rows are always locked in a deterministic order (smaller UUID first)
  --    to avoid deadlocks when two concurrent calls swap winner/loser roles.
  -- ------------------------------------------------------------------
  IF p_winner_id < p_loser_id THEN
    SELECT id, rating, matches_played, matches_won
    INTO v_winner_profile
    FROM public.profiles
    WHERE id = p_winner_id
    FOR UPDATE;

    SELECT id, rating, matches_played, matches_won
    INTO v_loser_profile
    FROM public.profiles
    WHERE id = p_loser_id
    FOR UPDATE;
  ELSE
    SELECT id, rating, matches_played, matches_won
    INTO v_loser_profile
    FROM public.profiles
    WHERE id = p_loser_id
    FOR UPDATE;

    SELECT id, rating, matches_played, matches_won
    INTO v_winner_profile
    FROM public.profiles
    WHERE id = p_winner_id
    FOR UPDATE;
  END IF;

  IF v_winner_profile IS NULL THEN
    RAISE EXCEPTION 'Profile not found for winner %', p_winner_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_loser_profile IS NULL THEN
    RAISE EXCEPTION 'Profile not found for loser %', p_loser_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- ------------------------------------------------------------------
  -- 4. Build score text from individual scores (mirrors route usage of
  --    body.score which callers pass as "<winner_score>-<loser_score>").
  -- ------------------------------------------------------------------
  v_score_text := p_winner_score::TEXT || '-' || p_loser_score::TEXT;

  -- ------------------------------------------------------------------
  -- 5. Update tournament_brackets: mark match completed.
  -- ------------------------------------------------------------------
  -- tournament_brackets has no completed_at column (schema as of migration 012).
  -- If a future migration adds it, extend this SET clause accordingly.
  UPDATE public.tournament_brackets
  SET
    winner_id = p_winner_id,
    score     = v_score_text,
    status    = 'completed'
  WHERE id = p_match_id;

  -- ------------------------------------------------------------------
  -- 6. Lock the bracket on first result (mirrors route behaviour).
  -- ------------------------------------------------------------------
  UPDATE public.tournaments
  SET bracket_locked = true
  WHERE id = p_tournament_id AND bracket_locked = false;

  -- ------------------------------------------------------------------
  -- 7. Insert match_results rows for winner and loser.
  -- ------------------------------------------------------------------
  INSERT INTO public.match_results (
    player_id,
    opponent_id,
    event_id,
    event_type,
    event_name,
    club_id,
    sport,
    result,
    score,
    is_official,
    rating_delta
  )
  SELECT
    p_winner_id,
    p_loser_id,
    p_tournament_id,
    'tournament',
    t.name,
    t.club_id,
    p_sport,
    'win',
    v_score_text,
    p_is_official,
    CASE WHEN p_is_official THEN c_win_delta ELSE 0 END
  FROM public.tournaments t
  WHERE t.id = p_tournament_id;

  INSERT INTO public.match_results (
    player_id,
    opponent_id,
    event_id,
    event_type,
    event_name,
    club_id,
    sport,
    result,
    score,
    is_official,
    rating_delta
  )
  SELECT
    p_loser_id,
    p_winner_id,
    p_tournament_id,
    'tournament',
    t.name,
    t.club_id,
    p_sport,
    'loss',
    v_score_text,
    p_is_official,
    CASE WHEN p_is_official THEN -c_loss_delta ELSE 0 END
  FROM public.tournaments t
  WHERE t.id = p_tournament_id;

  -- ------------------------------------------------------------------
  -- 8. Compute new ratings (clamped to [0.00, 9.99]).
  -- ------------------------------------------------------------------
  v_winner_new_rat := LEAST(
    9.99,
    GREATEST(0, COALESCE(v_winner_profile.rating, 0) + c_win_delta)
  );
  v_loser_new_rat := LEAST(
    9.99,
    GREATEST(0, COALESCE(v_loser_profile.rating, 0) - c_loss_delta)
  );

  -- ------------------------------------------------------------------
  -- 9. Update profiles: stats always; rating only when official.
  -- ------------------------------------------------------------------
  UPDATE public.profiles
  SET
    matches_played = COALESCE(matches_played, 0) + 1,
    matches_won    = COALESCE(matches_won, 0) + 1,
    rating         = CASE WHEN p_is_official THEN v_winner_new_rat
                          ELSE COALESCE(rating, 0)
                     END
  WHERE id = p_winner_id;

  UPDATE public.profiles
  SET
    matches_played = COALESCE(matches_played, 0) + 1,
    rating         = CASE WHEN p_is_official THEN v_loser_new_rat
                          ELSE COALESCE(rating, 0)
                     END
  WHERE id = p_loser_id;

  -- ------------------------------------------------------------------
  -- 10. Read current rankings (needed to compute incremental values).
  --     No FOR UPDATE here — profiles lock above already serialises
  --     concurrent updates for the same player; rankings rows for this
  --     (user_id, sport) pair are only ever written by this function.
  -- ------------------------------------------------------------------
  SELECT wins, losses, score
  INTO v_winner_ranking
  FROM public.rankings
  WHERE user_id = p_winner_id
    AND sport   = p_sport::public.sport_type;

  SELECT wins, losses, score
  INTO v_loser_ranking
  FROM public.rankings
  WHERE user_id = p_loser_id
    AND sport   = p_sport::public.sport_type;

  -- ------------------------------------------------------------------
  -- 11. Upsert rankings.
  -- ------------------------------------------------------------------
  INSERT INTO public.rankings (user_id, sport, wins, losses, score, updated_at)
  VALUES (
    p_winner_id,
    p_sport::public.sport_type,
    COALESCE(v_winner_ranking.wins, 0) + 1,
    COALESCE(v_winner_ranking.losses, 0),
    COALESCE(v_winner_ranking.score, 0) + 3,
    NOW()
  )
  ON CONFLICT (user_id, sport) DO UPDATE
    SET wins       = EXCLUDED.wins,
        score      = EXCLUDED.score,
        updated_at = EXCLUDED.updated_at;

  INSERT INTO public.rankings (user_id, sport, wins, losses, score, updated_at)
  VALUES (
    p_loser_id,
    p_sport::public.sport_type,
    COALESCE(v_loser_ranking.wins, 0),
    COALESCE(v_loser_ranking.losses, 0) + 1,
    GREATEST(0, COALESCE(v_loser_ranking.score, 0) - 1),
    NOW()
  )
  ON CONFLICT (user_id, sport) DO UPDATE
    SET losses     = EXCLUDED.losses,
        score      = EXCLUDED.score,
        updated_at = EXCLUDED.updated_at;

  -- ------------------------------------------------------------------
  -- 12. Auto-advance winner to next elimination round.
  --     next_round      = current_round + 1
  --     next_match_num  = CEIL(match_number / 2)
  --     slot            = player1_id if match_number is odd, else player2_id
  --     (Replicates the logic in the route handler exactly.)
  -- ------------------------------------------------------------------
  v_next_round     := v_match.round + 1;
  v_next_match_num := CEIL(v_match.match_number::NUMERIC / 2)::INT;
  v_slot           := CASE WHEN v_match.match_number % 2 = 1
                           THEN 'player1_id'
                           ELSE 'player2_id'
                      END;

  SELECT id
  INTO v_next_match_id
  FROM public.tournament_brackets
  WHERE tournament_id = p_tournament_id
    AND round         = v_next_round
    AND match_number  = v_next_match_num;

  IF v_next_match_id IS NOT NULL THEN
    IF v_slot = 'player1_id' THEN
      UPDATE public.tournament_brackets
      SET player1_id = p_winner_id
      WHERE id = v_next_match_id;
    ELSE
      UPDATE public.tournament_brackets
      SET player2_id = p_winner_id
      WHERE id = v_next_match_id;
    END IF;
  END IF;

  -- ------------------------------------------------------------------
  -- 13. Return result row.
  -- ------------------------------------------------------------------
  RETURN QUERY SELECT
    true,
    v_next_match_id,
    v_winner_new_rat::INT,
    v_loser_new_rat::INT;

EXCEPTION
  WHEN OTHERS THEN
    -- Log context to server logs without leaking internals to the caller.
    RAISE WARNING
      'score_bracket_match failed for match % tournament %: % (SQLSTATE %)',
      p_match_id, p_tournament_id, SQLERRM, SQLSTATE;
    -- Re-raise so PostgREST surfaces the original error message and the
    -- transaction is rolled back automatically.
    RAISE;
END;
$$;

-- ============================================================
-- Permissions
-- ============================================================

-- Revoke the default PUBLIC execute grant added by CREATE FUNCTION.
REVOKE EXECUTE ON FUNCTION public.score_bracket_match(
  UUID, UUID, UUID, UUID, INT, INT, TEXT, BOOLEAN
) FROM PUBLIC;

-- The route handler calls this via serviceClient (service_role JWT), but
-- granting to authenticated keeps the surface consistent with 018 and allows
-- future direct calls if the route is refactored to a Server Action.
GRANT EXECUTE ON FUNCTION public.score_bracket_match(
  UUID, UUID, UUID, UUID, INT, INT, TEXT, BOOLEAN
) TO authenticated;

-- ============================================================
-- Documentation
-- ============================================================

COMMENT ON FUNCTION public.score_bracket_match(
  UUID, UUID, UUID, UUID, INT, INT, TEXT, BOOLEAN
) IS
  'Atomically records the result of a tournament bracket match inside a single '
  'PostgreSQL transaction. Acquires FOR UPDATE locks on profile rows for both '
  'winner and loser (in UUID order to prevent deadlocks) before computing rating '
  'deltas, eliminating the lost-update race condition that existed in the '
  'multi-step application-layer flow. '
  'Steps performed in order: validate match state; lock profiles; mark bracket '
  'match completed; lock tournament bracket_locked; insert two match_results '
  'rows; update profiles (stats always, rating only when p_is_official=true); '
  'upsert rankings; advance winner to next bracket slot. '
  'Returns (bracket_updated, next_match_id, winner_new_rating, loser_new_rating). '
  'next_match_id is NULL when the match is the final or no next-round slot exists. '
  'Raises an exception (and rolls back) if the match is already completed, if '
  'the reported winner/loser are not the registered players, or if any profile '
  'is missing. Callable by authenticated role; runs as owning role '
  '(SECURITY DEFINER) to bypass RLS on write paths.';

-- ============================================================
-- ROLLBACK (run manually if this migration must be reverted)
-- ============================================================
-- REVOKE EXECUTE ON FUNCTION public.score_bracket_match(
--   UUID, UUID, UUID, UUID, INT, INT, TEXT, BOOLEAN
-- ) FROM authenticated;
-- DROP FUNCTION IF EXISTS public.score_bracket_match(
--   UUID, UUID, UUID, UUID, INT, INT, TEXT, BOOLEAN
-- );
