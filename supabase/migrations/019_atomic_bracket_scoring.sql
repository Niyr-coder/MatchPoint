-- Migration 019: Atomic bracket match scoring
--
-- Wraps 9 sequential writes (tournament_brackets, match_results, profiles,
-- rankings, bracket advance) inside a single PostgreSQL transaction with
-- FOR UPDATE locks on profiles to prevent lost-update race conditions.
--
-- Permissions (REVOKE from PUBLIC, GRANT to authenticated) are in migration 020
-- because the Supabase CLI cannot execute multiple top-level statements when
-- the file contains dollar-quoted ($$) function bodies.

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

  c_win_delta   CONSTANT NUMERIC(4,2) := 0.25;
  c_loss_delta  CONSTANT NUMERIC(4,2) := 0.15;
BEGIN
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

  IF p_winner_id <> v_match.player1_id AND p_winner_id <> v_match.player2_id THEN
    RAISE EXCEPTION 'El ganador debe ser uno de los participantes del partido'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_loser_id <> v_match.player1_id AND p_loser_id <> v_match.player2_id THEN
    RAISE EXCEPTION 'El perdedor debe ser uno de los participantes del partido'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Lock profiles in UUID order to prevent deadlocks
  IF p_winner_id < p_loser_id THEN
    SELECT id, rating, matches_played, matches_won INTO v_winner_profile
    FROM public.profiles WHERE id = p_winner_id FOR UPDATE;

    SELECT id, rating, matches_played, matches_won INTO v_loser_profile
    FROM public.profiles WHERE id = p_loser_id FOR UPDATE;
  ELSE
    SELECT id, rating, matches_played, matches_won INTO v_loser_profile
    FROM public.profiles WHERE id = p_loser_id FOR UPDATE;

    SELECT id, rating, matches_played, matches_won INTO v_winner_profile
    FROM public.profiles WHERE id = p_winner_id FOR UPDATE;
  END IF;

  IF v_winner_profile IS NULL THEN
    RAISE EXCEPTION 'Profile not found for winner %', p_winner_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_loser_profile IS NULL THEN
    RAISE EXCEPTION 'Profile not found for loser %', p_loser_id
      USING ERRCODE = 'no_data_found';
  END IF;

  v_score_text := p_winner_score::TEXT || '-' || p_loser_score::TEXT;

  UPDATE public.tournament_brackets
  SET winner_id = p_winner_id, score = v_score_text, status = 'completed'
  WHERE id = p_match_id;

  UPDATE public.tournaments
  SET bracket_locked = true
  WHERE id = p_tournament_id AND bracket_locked = false;

  INSERT INTO public.match_results (
    player_id, opponent_id, event_id, event_type, event_name,
    club_id, sport, result, score, is_official, rating_delta
  )
  SELECT
    p_winner_id, p_loser_id, p_tournament_id, 'tournament', t.name,
    t.club_id, p_sport, 'win', v_score_text, p_is_official,
    CASE WHEN p_is_official THEN c_win_delta ELSE 0 END
  FROM public.tournaments t WHERE t.id = p_tournament_id;

  INSERT INTO public.match_results (
    player_id, opponent_id, event_id, event_type, event_name,
    club_id, sport, result, score, is_official, rating_delta
  )
  SELECT
    p_loser_id, p_winner_id, p_tournament_id, 'tournament', t.name,
    t.club_id, p_sport, 'loss', v_score_text, p_is_official,
    CASE WHEN p_is_official THEN -c_loss_delta ELSE 0 END
  FROM public.tournaments t WHERE t.id = p_tournament_id;

  v_winner_new_rat := LEAST(9.99, GREATEST(0, COALESCE(v_winner_profile.rating, 0) + c_win_delta));
  v_loser_new_rat  := LEAST(9.99, GREATEST(0, COALESCE(v_loser_profile.rating, 0) - c_loss_delta));

  UPDATE public.profiles
  SET
    matches_played = COALESCE(matches_played, 0) + 1,
    matches_won    = COALESCE(matches_won, 0) + 1,
    rating         = CASE WHEN p_is_official THEN v_winner_new_rat ELSE COALESCE(rating, 0) END
  WHERE id = p_winner_id;

  UPDATE public.profiles
  SET
    matches_played = COALESCE(matches_played, 0) + 1,
    rating         = CASE WHEN p_is_official THEN v_loser_new_rat ELSE COALESCE(rating, 0) END
  WHERE id = p_loser_id;

  SELECT wins, losses, score INTO v_winner_ranking
  FROM public.rankings WHERE user_id = p_winner_id AND sport = p_sport::public.sport_type;

  SELECT wins, losses, score INTO v_loser_ranking
  FROM public.rankings WHERE user_id = p_loser_id AND sport = p_sport::public.sport_type;

  INSERT INTO public.rankings (user_id, sport, wins, losses, score, updated_at)
  VALUES (
    p_winner_id, p_sport::public.sport_type,
    COALESCE(v_winner_ranking.wins, 0) + 1,
    COALESCE(v_winner_ranking.losses, 0),
    COALESCE(v_winner_ranking.score, 0) + 3,
    NOW()
  )
  ON CONFLICT (user_id, sport) DO UPDATE
    SET wins = EXCLUDED.wins, score = EXCLUDED.score, updated_at = EXCLUDED.updated_at;

  INSERT INTO public.rankings (user_id, sport, wins, losses, score, updated_at)
  VALUES (
    p_loser_id, p_sport::public.sport_type,
    COALESCE(v_loser_ranking.wins, 0),
    COALESCE(v_loser_ranking.losses, 0) + 1,
    GREATEST(0, COALESCE(v_loser_ranking.score, 0) - 1),
    NOW()
  )
  ON CONFLICT (user_id, sport) DO UPDATE
    SET losses = EXCLUDED.losses, score = EXCLUDED.score, updated_at = EXCLUDED.updated_at;

  v_next_round     := v_match.round + 1;
  v_next_match_num := CEIL(v_match.match_number::NUMERIC / 2)::INT;
  v_slot           := CASE WHEN v_match.match_number % 2 = 1 THEN 'player1_id' ELSE 'player2_id' END;

  SELECT id INTO v_next_match_id
  FROM public.tournament_brackets
  WHERE tournament_id = p_tournament_id
    AND round         = v_next_round
    AND match_number  = v_next_match_num;

  IF v_next_match_id IS NOT NULL THEN
    IF v_slot = 'player1_id' THEN
      UPDATE public.tournament_brackets SET player1_id = p_winner_id WHERE id = v_next_match_id;
    ELSE
      UPDATE public.tournament_brackets SET player2_id = p_winner_id WHERE id = v_next_match_id;
    END IF;
  END IF;

  RETURN QUERY SELECT true, v_next_match_id, v_winner_new_rat::INT, v_loser_new_rat::INT;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'score_bracket_match failed for match % tournament %: % (SQLSTATE %)',
      p_match_id, p_tournament_id, SQLERRM, SQLSTATE;
    RAISE;
END;
$$
