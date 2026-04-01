/**
 * In-memory sliding-window rate limiter.
 *
 * Trade-offs vs. Upstash/Redis:
 *  - State is per-process: resets on cold starts and is not shared across
 *    multiple Vercel instances (each worker has its own Map).
 *  - Suitable for MVP / single-worker deployments. Replace with
 *    @upstash/ratelimit + @upstash/redis when horizontal scaling is needed.
 *
 * The sliding window algorithm records each request timestamp and evicts
 * entries outside the current window on every check — no background timer
 * or memory leak.
 */

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
 * One limiter instance per named bucket.
 * Key: "<bucket>:<identifier>", Value: sorted list of request timestamps.
 */
const store = new Map<string, number[]>()

/**
 * Checks whether the given identifier is within its rate limit for a bucket.
 * Mutates the store entry for that key (adds current timestamp, evicts old ones).
 *
 * @param bucket     - A namespaced string identifying the limit rule (e.g. "waitlist").
 * @param identifier - The per-client key (typically an IP address).
 * @param config     - Limit and window configuration.
 */
export function checkRateLimit(
  bucket: string,
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { limit, windowMs } = config
  const now = Date.now()
  const windowStart = now - windowMs
  const storeKey = `${bucket}:${identifier}`

  const timestamps = store.get(storeKey) ?? []

  // Evict timestamps outside the current sliding window
  const active = timestamps.filter((ts) => ts > windowStart)

  const resetAt = active.length > 0 ? active[0] + windowMs : now + windowMs
  const retryAfterSeconds = Math.ceil((resetAt - now) / 1000)

  if (active.length >= limit) {
    // Do not record this request — it is being rejected
    store.set(storeKey, active)
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterSeconds,
    }
  }

  // Record the new request and persist
  const updated = [...active, now]
  store.set(storeKey, updated)

  return {
    allowed: true,
    remaining: limit - updated.length,
    resetAt,
    retryAfterSeconds: 0,
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
  // Fallback: treat unknown origin as a single shared key rather than skipping
  // rate limiting entirely. This is conservative but safe.
  return "unknown"
}

// ---------------------------------------------------------------------------
// Pre-configured limit profiles — one per protected route bucket
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  waitlist: { limit: 5, windowMs: 60_000 } satisfies RateLimitConfig,
  shopOrders: { limit: 10, windowMs: 60_000 } satisfies RateLimitConfig,
  messages: { limit: 30, windowMs: 60_000 } satisfies RateLimitConfig,
} as const
