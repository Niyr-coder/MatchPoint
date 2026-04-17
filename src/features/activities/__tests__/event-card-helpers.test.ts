import { describe, it, expect } from "vitest"
import { formatTimeRange, daysUntilDeadline, capacityColor } from "../components/EventCard"

describe("formatTimeRange", () => {
  it("returns just start time when no end_date", () => {
    expect(formatTimeRange("2026-04-19T09:00:00")).toBe("9:00")
  })
  it("returns time range with duration when end_date provided", () => {
    expect(formatTimeRange("2026-04-19T09:00:00", "2026-04-19T11:00:00")).toBe("9:00–11:00 (2h)")
  })
  it("handles fractional hours", () => {
    expect(formatTimeRange("2026-04-19T09:00:00", "2026-04-19T10:30:00")).toBe("9:00–10:30 (1.5h)")
  })
  it("returns just start time when end_date is null", () => {
    expect(formatTimeRange("2026-04-19T09:00:00", null)).toBe("9:00")
  })
})

describe("daysUntilDeadline", () => {
  it("returns negative value for past dates", () => {
    expect(daysUntilDeadline("2020-01-01T00:00:00")).toBeLessThan(0)
  })
  it("returns ~5 for a date 5 days from now", () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    expect(daysUntilDeadline(future)).toBe(5)
  })
})

describe("capacityColor", () => {
  it("returns black when below 75%", () => {
    expect(capacityColor(7, 10)).toBe("black")
    expect(capacityColor(0, 10)).toBe("black")
    expect(capacityColor(74, 100)).toBe("black")
  })
  it("returns amber at 75%", () => {
    expect(capacityColor(75, 100)).toBe("amber")
    expect(capacityColor(80, 100)).toBe("amber")
    expect(capacityColor(99, 100)).toBe("amber")
  })
  it("returns red at 100%", () => {
    expect(capacityColor(10, 10)).toBe("red")
    expect(capacityColor(100, 100)).toBe("red")
  })
})
