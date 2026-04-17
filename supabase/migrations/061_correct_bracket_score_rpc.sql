-- Migration 061: correct_bracket_match_score RPC
--
-- Corrects a previously scored bracket match within a single transaction.
-- Steps:
--   1. Fetch and validate the match (winner must be a participant).
--   2. Lock both player profiles in UUID order (deadlock prevention).
--   3. Update tournament_brackets (score, winner_id, status).
--   4. Insert an audit row into bracket_score_corrections.
--   5. If the winner changed and round >= 1, propagate the correction to
--      the next-round match (replace old_winner_id with new_winner_id).
--   6. If the tournament is_official and the winner changed, adjust ratings
--      (+0.25 new winner / -0.25 new loser; reverse for old winner/loser).
--
-- Permissions are granted in the same file to keep them co-located.
-- The function runs as SECURITY DEFINER so INSERT into bracket_score_corrections
-- succeeds even though no direct-insert RLS policy exists on that table.

CREATE OR REPLACE FUNCTION public.correct_bracket_match_score(
  p_match_id       uuid,
  p_new_score      text,
  p_new_winner_id  uuid,
  p_reason         text,
  p_corrected_by   uuid
)
RETURNS TABLE(
  correction_id  uuid,
  winner_changed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match          RECORD;
  v_tournament     RECORD;
  v_old_loser_id   uuid;
  v_new_loser_id   uuid;
  v_next_match_id  uuid;
  v_next_round     int;
  v_next_match_num int;
  v_correction_id  uuid;
  v_winner_changed boolean;

  c_correction_delta  CONSTANT numeric(4,2) := 0.25;
BEGIN
  -- -------------------------------------------------------------------------
  -- 1. Validate inputs
  -- -------------------------------------------------------------------------
  IF p_match_id IS NULL OR p_new_winner_id IS NULL OR p_reason IS NULL THEN
    RAISE EXCEPTION 'p_match_id, p_new_winner_id, and p_reason are required'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_new_score IS NULL OR trim(p_new_score) = '' THEN
    RAISE EXCEPTION 'p_new_score must not be empty'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_corrected_by IS NULL THEN
    RAISE EXCEPTION 'p_corrected_by is required'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- -------------------------------------------------------------------------
  -- 2. Fetch the match
  -- -------------------------------------------------------------------------
  SELECT
    tb.id,
    tb.round,
    tb.match_number,
    tb.player1_id,
    tb.player2_id,
    tb.winner_id  AS old_winner_id,
    tb.score      AS old_score,
    tb.tournament_id
  INTO v_match
  FROM public.tournament_brackets tb
  WHERE tb.id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bracket match % not found', p_match_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- -------------------------------------------------------------------------
  -- 3. Validate new_winner_id is a participant
  -- -------------------------------------------------------------------------
  IF p_new_winner_id <> v_match.player1_id AND p_new_winner_id <> v_match.player2_id THEN
    RAISE EXCEPTION 'new_winner_id must be player1_id or player2_id of the match'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Derive loser IDs
  v_new_loser_id := CASE
    WHEN p_new_winner_id = v_match.player1_id THEN v_match.player2_id
    ELSE v_match.player1_id
  END;

  v_old_loser_id := CASE
    WHEN v_match.old_winner_id = v_match.player1_id THEN v_match.player2_id
    WHEN v_match.old_winner_id = v_match.player2_id THEN v_match.player1_id
    ELSE NULL  -- match had no prior winner (shouldn't normally happen)
  END;

  v_winner_changed := (v_match.old_winner_id IS DISTINCT FROM p_new_winner_id);

  -- -------------------------------------------------------------------------
  -- 4. Lock profiles in UUID order to prevent deadlocks
  -- -------------------------------------------------------------------------
  IF v_match.player1_id < v_match.player2_id THEN
    PERFORM id FROM public.profiles WHERE id = v_match.player1_id FOR UPDATE;
    PERFORM id FROM public.profiles WHERE id = v_match.player2_id FOR UPDATE;
  ELSE
    PERFORM id FROM public.profiles WHERE id = v_match.player2_id FOR UPDATE;
    PERFORM id FROM public.profiles WHERE id = v_match.player1_id FOR UPDATE;
  END IF;

  -- -------------------------------------------------------------------------
  -- 5. Update tournament_brackets
  -- -------------------------------------------------------------------------
  UPDATE public.tournament_brackets
  SET
    score     = p_new_score,
    winner_id = p_new_winner_id,
    status    = 'completed'
  WHERE id = p_match_id;

  -- -------------------------------------------------------------------------
  -- 6. Insert audit record
  -- -------------------------------------------------------------------------
  INSERT INTO public.bracket_score_corrections (
    match_id,
    corrected_by,
    old_score,
    new_score,
    old_winner_id,
    new_winner_id,
    reason
  ) VALUES (
    p_match_id,
    p_corrected_by,
    v_match.old_score,
    p_new_score,
    v_match.old_winner_id,
    p_new_winner_id,
    p_reason
  )
  RETURNING id INTO v_correction_id;

  -- -------------------------------------------------------------------------
  -- 7. Propagate winner change to the next-round match (round >= 1 only)
  -- -------------------------------------------------------------------------
  IF v_winner_changed AND v_match.round >= 1 AND v_match.old_winner_id IS NOT NULL THEN
    v_next_round     := v_match.round + 1;
    v_next_match_num := CEIL(v_match.match_number::numeric / 2)::int;

    SELECT id INTO v_next_match_id
    FROM public.tournament_brackets
    WHERE tournament_id = v_match.tournament_id
      AND round         = v_next_round
      AND match_number  = v_next_match_num
      AND (player1_id = v_match.old_winner_id OR player2_id = v_match.old_winner_id);

    IF v_next_match_id IS NOT NULL THEN
      UPDATE public.tournament_brackets
      SET
        player1_id = CASE
          WHEN player1_id = v_match.old_winner_id THEN p_new_winner_id
          ELSE player1_id
        END,
        player2_id = CASE
          WHEN player2_id = v_match.old_winner_id THEN p_new_winner_id
          ELSE player2_id
        END
      WHERE id = v_next_match_id;
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- 8. Rating adjustment for official tournaments when winner changed
  -- -------------------------------------------------------------------------
  IF v_winner_changed AND v_match.old_winner_id IS NOT NULL AND v_old_loser_id IS NOT NULL THEN
    SELECT is_official INTO v_tournament
    FROM public.tournaments
    WHERE id = v_match.tournament_id;

    IF v_tournament.is_official THEN
      -- New winner: +0.25
      UPDATE public.profiles
      SET rating = LEAST(9.99, GREATEST(0, COALESCE(rating, 0) + c_correction_delta))
      WHERE id = p_new_winner_id;

      -- New loser: -0.25
      UPDATE public.profiles
      SET rating = LEAST(9.99, GREATEST(0, COALESCE(rating, 0) - c_correction_delta))
      WHERE id = v_new_loser_id;

      -- Old winner (now corrected to loser): -0.25 reversal
      IF v_match.old_winner_id <> p_new_winner_id THEN
        UPDATE public.profiles
        SET rating = LEAST(9.99, GREATEST(0, COALESCE(rating, 0) - c_correction_delta))
        WHERE id = v_match.old_winner_id;
      END IF;

      -- Old loser (now corrected to winner): +0.25 reversal
      IF v_old_loser_id <> v_new_loser_id THEN
        UPDATE public.profiles
        SET rating = LEAST(9.99, GREATEST(0, COALESCE(rating, 0) + c_correction_delta))
        WHERE id = v_old_loser_id;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT v_correction_id, v_winner_changed;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'correct_bracket_match_score failed for match % corrected_by %: % (SQLSTATE %)',
      p_match_id, p_corrected_by, SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.correct_bracket_match_score(uuid, text, uuid, text, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.correct_bracket_match_score(uuid, text, uuid, text, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- ROLLBACK (commented out — run manually if needed)
-- ---------------------------------------------------------------------------
-- DROP FUNCTION IF EXISTS public.correct_bracket_match_score(uuid, text, uuid, text, uuid);
