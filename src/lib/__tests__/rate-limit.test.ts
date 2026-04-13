import { describe, it, expect } from "vitest"
import { RATE_LIMITS } from "@/lib/rate-limit"

describe("RATE_LIMITS", () => {
  it("exports buckets with positive limits", () => {
    for (const [key, cfg] of Object.entries(RATE_LIMITS)) {
      expect(cfg.limit, `${key}.limit`).toBeGreaterThan(0)
      expect(cfg.window, `${key}.window`).toBeGreaterThan(0)
    }
  })

  it("sensitive buckets are more restrictive than general ones", () => {
    expect(RATE_LIMITS.auth.limit).toBeLessThanOrEqual(RATE_LIMITS.general?.limit ?? Infinity)
  })
})
