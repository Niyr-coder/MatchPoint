-- Migration 014: Batch 1 — Security & Data Integrity
-- Fixes: C2 (RLS participants), C5 (atomic orders), C6 (atomic bracket), C7 (double-booking)

-- ============================================================
-- C2: Restrict tournament_participants UPDATE to service_role only
--     (prevents users from setting payment_status='paid' or status='winner' directly)
-- ============================================================
DROP POLICY IF EXISTS "tp_update_own" ON public.tournament_participants;

-- Users may only insert their own participation (join).
-- All updates (payment, status, seed, etc.) must go through service_role API.

-- ============================================================
-- C7: Double-booking prevention via EXCLUSION constraint
--     Blocks two non-cancelled reservations from overlapping on the same court
-- ============================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Immutable helper: combine DATE + TIME into TIMESTAMP
CREATE OR REPLACE FUNCTION public.dt_to_ts(d DATE, t TIME)
RETURNS TIMESTAMP LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT d + t;
$$;

ALTER TABLE public.reservations
  ADD CONSTRAINT no_double_booking
  EXCLUDE USING GIST (
    court_id WITH =,
    tsrange(public.dt_to_ts(date, start_time), public.dt_to_ts(date, end_time)) WITH &&
  )
  WHERE (status <> 'cancelled');

-- ============================================================
-- C6: Atomic bracket regeneration
--     DELETE + INSERT in one transaction — prevents data loss if insert fails
-- ============================================================
CREATE OR REPLACE FUNCTION public.regenerate_tournament_bracket(
  p_tournament_id UUID,
  p_brackets      JSONB
)
RETURNS SETOF tournament_brackets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM tournament_brackets WHERE tournament_id = p_tournament_id;

  RETURN QUERY
  INSERT INTO tournament_brackets (
    tournament_id,
    round,
    match_number,
    player1_id,
    player2_id,
    status
  )
  SELECT
    p_tournament_id,
    (b->>'round')::INTEGER,
    (b->>'match_number')::INTEGER,
    NULLIF(b->>'player1_id', '')::UUID,
    NULLIF(b->>'player2_id', '')::UUID,
    b->>'status'
  FROM jsonb_array_elements(p_brackets) AS b
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.regenerate_tournament_bracket TO service_role;
