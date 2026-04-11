-- Atomic event registration function
-- Prevents race condition where two concurrent registrations could exceed max_capacity
-- by locking the event row (FOR UPDATE) before reading the count and inserting.

CREATE OR REPLACE FUNCTION public.register_for_event(
  p_event_id UUID,
  p_user_id  UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_capacity    INTEGER;
  v_current_count   INTEGER;
  v_registration_id UUID;
BEGIN
  -- Lock the event row to prevent concurrent capacity reads
  SELECT max_capacity INTO v_max_capacity
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EVENT_NOT_FOUND';
  END IF;

  IF v_max_capacity IS NOT NULL THEN
    SELECT count(*) INTO v_current_count
    FROM public.event_registrations
    WHERE event_id = p_event_id;

    IF v_current_count >= v_max_capacity THEN
      RAISE EXCEPTION 'EVENT_FULL';
    END IF;
  END IF;

  INSERT INTO public.event_registrations (event_id, user_id)
  VALUES (p_event_id, p_user_id)
  RETURNING id INTO v_registration_id;

  RETURN v_registration_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_for_event(UUID, UUID) TO authenticated;

-- ROLLBACK:
-- REVOKE EXECUTE ON FUNCTION public.register_for_event(UUID, UUID) FROM authenticated;
-- DROP FUNCTION IF EXISTS public.register_for_event(UUID, UUID);
