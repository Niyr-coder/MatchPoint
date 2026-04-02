/**
 * Persistent sliding-window rate limiter backed by Supabase.
 *
 * Uses the `check_rate_limit` RPC (migration 027) which atomically counts
 * requests in a rolling window and inserts the current request when allowed.
 * State is shared across all Vercel instances and survives cold starts.
 *
 * Fails open: if the DB call errors, the request is allowed through so that
 * a database hiccup never takes down the entire API.
 */

import { createServiceClient } from "@/lib/supabase/server"

export interface RateLimitConfig {
  /** Maximum number of allowed requests within the window. */
  limit: number
  /** Window duration in milliseconds. */
  windowMs: number
}

export interface RateLimitResult {
  /** Whether the request is allowed through. */
  allowed: boolean
  /** How many requests remain in the current window. */
  remaining: number
  /** Unix timestamp (ms) when the current window resets. */
  resetAt: number
  /** Seconds until the window resets (for Retry-After header). */
  retryAfterSeconds: number
}

/**
 * Checks whether the given identifier is within its rate limit for a bucket.
 * Delegates to the `check_rate_limit` Postgres function for atomic, shared state.
 *
 * @param bucket     - Namespaced string identifying the limit rule (e.g. "waitlist").
 * @param identifier - Per-client key (typically an IP address).
 * @param config     - Limit and window configuration.
 */
export async function checkRateLimit(
  bucket: string,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, windowMs } = config

  try {
    const service = await createServiceClient()
    const { data, error } = await service.rpc("check_rate_limit", {
      p_bucket:     bucket,
      p_identifier: identifier,
      p_limit:      limit,
      p_window_ms:  windowMs,
    })

    if (error || !data) {
      // Fail open — never block traffic due to a rate-limit DB error
      console.error("[rate-limit] RPC error, failing open:", error?.message)
      return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs, retryAfterSeconds: 0 }
    }

    const result = data as { allowed: boolean; remaining: number; reset_at: number; retry_after_seconds: number }
    return {
      allowed:           result.allowed,
      remaining:         result.remaining,
      resetAt:           result.reset_at,
      retryAfterSeconds: result.retry_after_seconds,
    }
  } catch (err) {
    console.error("[rate-limit] Unexpected error, failing open:", err)
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs, retryAfterSeconds: 0 }
  }
}

/**
 * Extracts the client IP from a Next.js request.
 * Reads x-forwarded-for (set by Vercel / reverse proxies) and returns the
 * first (leftmost) IP, which is the originating client.
 * Falls back to a placeholder so rate limiting never throws.
 */
export function getClientIp(request: Request): string {
  const forwarded = (request.headers as Headers).get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0].trim()
    if (first) return first
  }
  return "unknown"
}

// ---------------------------------------------------------------------------
// Pre-configured limit profiles — one per protected route bucket
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  waitlist:       { limit: 5,  windowMs:    60_000 } satisfies RateLimitConfig,
  shopOrders:     { limit: 10, windowMs:    60_000 } satisfies RateLimitConfig,
  messages:       { limit: 30, windowMs:    60_000 } satisfies RateLimitConfig,
  invitesCreate:  { limit: 20, windowMs: 3_600_000 } satisfies RateLimitConfig,
  invitesRedeem:  { limit: 10, windowMs: 3_600_000 } satisfies RateLimitConfig,
} as const
