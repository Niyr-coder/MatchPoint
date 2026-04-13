/**
 * Persistent sliding-window rate limiter backed by Supabase.
 *
 * Uses the `check_rate_limit` RPC (migration 027) which atomically counts
 * requests in a rolling window and inserts the current request when allowed.
 * State is shared across all Vercel instances and survives cold starts.
 *
 * Fails CLOSED: if the DB call errors, the request is denied. A transient
 * database hiccup will cause temporary 429s, but this is preferable to
 * allowing unlimited requests when the rate-limit service is unreachable.
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
    const service = createServiceClient()
    const { data, error } = await service.rpc("check_rate_limit", {
      p_bucket:     bucket,
      p_identifier: identifier,
      p_limit:      limit,
      p_window_ms:  windowMs,
    })

    if (error || !data) {
      // Fail closed — deny when the rate-limit service is unavailable
      console.error("[rate-limit] RPC error, failing closed:", error?.message)
      return { allowed: false, remaining: 0, resetAt: Date.now() + windowMs, retryAfterSeconds: windowMs / 1000 }
    }

    const result = data as { allowed: boolean; remaining: number; reset_at: number; retry_after_seconds: number }
    return {
      allowed:           result.allowed,
      remaining:         result.remaining,
      resetAt:           result.reset_at,
      retryAfterSeconds: result.retry_after_seconds,
    }
  } catch (err) {
    console.error("[rate-limit] Unexpected error, failing closed:", err)
    return { allowed: false, remaining: 0, resetAt: Date.now() + windowMs, retryAfterSeconds: windowMs / 1000 }
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
  eventsCreate:   { limit: 10, windowMs: 3_600_000 } satisfies RateLimitConfig,
  // Added in Phase 3 audit
  reservations:    { limit: 10, windowMs:    60_000 } satisfies RateLimitConfig,  // 10 bookings/min per user
  tournamentJoin:  { limit: 5,  windowMs: 3_600_000 } satisfies RateLimitConfig,  // 5 joins/hour per user
  profileUpdate:   { limit: 20, windowMs:    60_000 } satisfies RateLimitConfig,  // 20 updates/min per IP
  clubRequests:    { limit: 3,  windowMs: 3_600_000 } satisfies RateLimitConfig,  // 3 requests/hour per user
  adminCreateUser: { limit: 20, windowMs: 3_600_000 } satisfies RateLimitConfig,  // 20 creates/hour per admin
  // Added in Phase 3 audit (round 2)
  shopProductCreate:  { limit: 20, windowMs:  3_600_000 } satisfies RateLimitConfig,  // 20 product creates/hour
  tournamentCreate:   { limit: 5,  windowMs:  3_600_000 } satisfies RateLimitConfig,  // 5 tournaments/hour
  teamCreate:         { limit: 5,  windowMs:  3_600_000 } satisfies RateLimitConfig,  // 5 teams/hour
  teamJoin:           { limit: 10, windowMs:  3_600_000 } satisfies RateLimitConfig,  // 10 joins/hour
  eventRegister:      { limit: 10, windowMs:  3_600_000 } satisfies RateLimitConfig,  // 10 registrations/hour
  conversationRead:   { limit: 60, windowMs:     60_000 } satisfies RateLimitConfig,  // 60 reads/min (generous)
  adminBulk:          { limit: 5,  windowMs:  3_600_000 } satisfies RateLimitConfig,  // 5 bulk ops/hour
  proofUpload:        { limit: 10, windowMs:  3_600_000 } satisfies RateLimitConfig,  // 10 uploads/hour
} as const
