import { describe, it, expect } from "vitest"
import {
  getWeekDates,
  addWeeks,
  getCurrentWeekMonday,
  formatWeekLabel,
  isSlotOccupied,
  type WeekReservation,
} from "../utils/calendar"

describe("getWeekDates", () => {
  it("returns 7 dates starting from the given Monday", () => {
    const dates = getWeekDates("2026-04-13")
    expect(dates).toHaveLength(7)
    expect(dates[0]).toBe("2026-04-13")
    expect(dates[6]).toBe("2026-04-19")
  })

  it("returns consecutive dates", () => {
    const dates = getWeekDates("2026-04-13")
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + "T00:00:00Z")
      const curr = new Date(dates[i] + "T00:00:00Z")
      expect(curr.getTime() - prev.getTime()).toBe(86400000)
    }
  })

  it("each element is a valid YYYY-MM-DD string", () => {
    const dates = getWeekDates("2026-04-13")
    for (const d of dates) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe("addWeeks", () => {
  it("advances by 1 week", () => {
    expect(addWeeks("2026-04-13", 1)).toBe("2026-04-20")
  })

  it("retreats by 1 week", () => {
    expect(addWeeks("2026-04-20", -1)).toBe("2026-04-13")
  })

  it("zero delta returns same date", () => {
    expect(addWeeks("2026-04-13", 0)).toBe("2026-04-13")
  })
})

describe("getCurrentWeekMonday", () => {
  it("returns a Monday (getDay() === 1)", () => {
    const result = getCurrentWeekMonday()
    // Parse as local date to match the implementation
    const [year, month, day] = result.split("-").map(Number)
    const date = new Date(year, month - 1, day)
    expect(date.getDay()).toBe(1)
  })

  it("returns a YYYY-MM-DD formatted string", () => {
    const result = getCurrentWeekMonday()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe("formatWeekLabel", () => {
  it('formats "2026-04-13" correctly', () => {
    expect(formatWeekLabel("2026-04-13")).toBe("13 – 19 abr 2026")
  })

  it("uses Spanish month abbreviation for January", () => {
    // 2026-01-05 is a Monday
    expect(formatWeekLabel("2026-01-05")).toBe("5 – 11 ene 2026")
  })

  it("handles a week that spans two months", () => {
    // 2026-04-27 Monday → ends 2026-05-03 (may)
    expect(formatWeekLabel("2026-04-27")).toBe("27 – 3 may 2026")
  })
})

describe("isSlotOccupied", () => {
  const reservations: WeekReservation[] = [
    {
      court_id: "c1",
      date: "2026-04-13",
      start_time: "10:00",
      end_time: "12:00",
    },
  ]

  it("returns true when slot starts at reservation start (hour=10)", () => {
    expect(isSlotOccupied(reservations, "c1", "2026-04-13", 10)).toBe(true)
  })

  it("returns true when slot is inside reservation (hour=11)", () => {
    expect(isSlotOccupied(reservations, "c1", "2026-04-13", 11)).toBe(true)
  })

  it("returns false when slot starts exactly when reservation ends (hour=12)", () => {
    expect(isSlotOccupied(reservations, "c1", "2026-04-13", 12)).toBe(false)
  })

  it("returns false when slot is before reservation (hour=9)", () => {
    expect(isSlotOccupied(reservations, "c1", "2026-04-13", 9)).toBe(false)
  })

  it("returns false for a different court (c2, hour=10)", () => {
    expect(isSlotOccupied(reservations, "c2", "2026-04-13", 10)).toBe(false)
  })

  it("returns false for a different date (c1, 2026-04-14, hour=10)", () => {
    expect(isSlotOccupied(reservations, "c1", "2026-04-14", 10)).toBe(false)
  })
})
