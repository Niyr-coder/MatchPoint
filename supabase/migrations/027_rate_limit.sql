-- Migration 027: Persistent rate limiting table + RPC
-- Replaces in-memory sliding-window limiter (resets on cold starts, not shared across instances).

CREATE TABLE IF NOT EXISTS public.rate_limit_requests (
  id        BIGSERIAL   PRIMARY KEY,
  bucket    TEXT        NOT NULL,
  identifier TEXT       NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rate_limit_requests_lookup
  ON public.rate_limit_requests (bucket, identifier, created_at DESC);

-- No RLS needed — only accessed via service role from rate-limit.ts
ALTER TABLE public.rate_limit_requests DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- check_rate_limit(bucket, identifier, limit, window_ms)
--
-- Atomically counts requests in the sliding window and, if allowed,
-- inserts the current request. Probabilistically cleans up old rows (1%).
--
-- Returns JSONB: { allowed, remaining, reset_at (epoch ms), retry_after_seconds }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_bucket     TEXT,
  p_identifier TEXT,
  p_limit      INTEGER,
  p_window_ms  BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now          TIMESTAMPTZ := NOW();
  v_window_start TIMESTAMPTZ := v_now - (p_window_ms || ' milliseconds')::INTERVAL;
  v_count        INTEGER;
  v_oldest       TIMESTAMPTZ;
  v_reset_ms     BIGINT;
  v_retry        INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limit_requests
  WHERE bucket     = p_bucket
    AND identifier = p_identifier
    AND created_at > v_window_start;

  IF v_count >= p_limit THEN
    SELECT MIN(created_at) INTO v_oldest
    FROM public.rate_limit_requests
    WHERE bucket     = p_bucket
      AND identifier = p_identifier
      AND created_at > v_window_start;

    v_reset_ms := EXTRACT(EPOCH FROM (v_oldest + (p_window_ms || ' milliseconds')::INTERVAL))::BIGINT * 1000;
    v_retry    := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_oldest + (p_window_ms || ' milliseconds')::INTERVAL - v_now))));

    RETURN jsonb_build_object(
      'allowed',              false,
      'remaining',            0,
      'reset_at',             v_reset_ms,
      'retry_after_seconds',  v_retry
    );
  END IF;

  INSERT INTO public.rate_limit_requests (bucket, identifier, created_at)
  VALUES (p_bucket, p_identifier, v_now);

  -- Probabilistic cleanup: ~1% of requests purge entries older than 1 hour
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limit_requests
    WHERE created_at < NOW() - INTERVAL '1 hour';
  END IF;

  RETURN jsonb_build_object(
    'allowed',              true,
    'remaining',            p_limit - v_count - 1,
    'reset_at',             EXTRACT(EPOCH FROM (v_now + (p_window_ms || ' milliseconds')::INTERVAL))::BIGINT * 1000,
    'retry_after_seconds',  0
  );
END;
$$;
