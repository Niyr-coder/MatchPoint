-- supabase/migrations/052_reserve_slot_atomic.sql

-- ── Performance index for overlap queries ───────────────────────────
CREATE INDEX IF NOT EXISTS reservations_court_date_active_idx
  ON public.reservations(court_id, date, start_time, end_time)
  WHERE status != 'cancelled';

-- ── Atomic slot reservation function ────────────────────────────────
CREATE OR REPLACE FUNCTION public.reserve_slot(
  p_court_id    UUID,
  p_user_id     UUID,
  p_date        DATE,
  p_start_time  TIME,
  p_end_time    TIME,
  p_total_price NUMERIC,
  p_notes       TEXT DEFAULT NULL
)
RETURNS SETOF public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Serialize concurrent reservations for this court+date.
  -- hashtext() returns int4; pg_advisory_xact_lock(int4, int4) is valid.
  -- Lock is released automatically at transaction end.
  PERFORM pg_advisory_xact_lock(
    hashtext(p_court_id::text),
    hashtext(p_date::text)
  );

  -- Check for time-range overlap with active reservations.
  -- Two ranges [a,b) and [c,d) overlap when a < d AND b > c.
  IF EXISTS (
    SELECT 1
    FROM   public.reservations
    WHERE  court_id   = p_court_id
      AND  date       = p_date
      AND  status    != 'cancelled'
      AND  start_time < p_end_time
      AND  end_time   > p_start_time
  ) THEN
    RAISE EXCEPTION 'slot_conflict'
      USING ERRCODE = 'P0001',
            DETAIL  = 'The requested time slot overlaps an existing reservation.';
  END IF;

  -- Insert and return the new reservation.
  RETURN QUERY
  INSERT INTO public.reservations
    (court_id, user_id, date, start_time, end_time, total_price, notes)
  VALUES
    (p_court_id, p_user_id, p_date, p_start_time, p_end_time, p_total_price, p_notes)
  RETURNING *;
END;
$$;

-- Grant execute to authenticated users (RLS on the table still applies).
GRANT EXECUTE ON FUNCTION public.reserve_slot(UUID, UUID, DATE, TIME, TIME, NUMERIC, TEXT)
  TO authenticated;
