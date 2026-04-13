import { describe, it, expect } from "vitest"
import { RATE_LIMITS } from "@/lib/rate-limit"

describe("RATE_LIMITS", () => {
  it("exports buckets with positive limits and windows", () => {
    for (const [key, cfg] of Object.entries(RATE_LIMITS)) {
      expect(cfg.limit, `${key}.limit`).toBeGreaterThan(0)
      expect(cfg.windowMs, `${key}.windowMs`).toBeGreaterThan(0)
    }
  })

  it("auth-adjacent buckets are more restrictive than high-volume ones", () => {
    expect(RATE_LIMITS.waitlist.limit).toBeLessThan(RATE_LIMITS.conversationRead.limit)
  })
})
