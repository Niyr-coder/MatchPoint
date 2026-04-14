export interface WeekReservation {
  court_id: string
  date: string       // YYYY-MM-DD
  start_time: string // HH:MM
  end_time: string   // HH:MM
}

const MONTHS_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
] as const

/**
 * Returns 7 YYYY-MM-DD strings starting at weekStart (expected: a Monday).
 * Uses UTC arithmetic so timezone offsets don't shift dates.
 */
export function getWeekDates(weekStart: string): string[] {
  const base = new Date(weekStart + "T00:00:00Z")
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base.getTime() + i * 86400000)
    return toDateString(d, "utc")
  })
}

/**
 * Advances or retreats weekStart by delta weeks. Returns YYYY-MM-DD.
 */
export function addWeeks(weekStart: string, delta: number): string {
  const base = new Date(weekStart + "T00:00:00Z")
  const result = new Date(base.getTime() + delta * 7 * 86400000)
  return toDateString(result, "utc")
}

/**
 * Returns the Monday of the current local week in YYYY-MM-DD.
 * Treats Sunday (getDay()===0) as the 7th day of the week (not the 1st).
 *
 * Uses local time for "today" (so the displayed week matches the user's calendar),
 * but the returned string is compatible with the UTC-safe `getWeekDates` and `addWeeks`
 * functions since those parse "YYYY-MM-DD" as "YYYY-MM-DDT00:00:00Z".
 */
export function getCurrentWeekMonday(): string {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(now.getDate() - daysFromMonday)
  return toDateString(monday, "local")
}

/**
 * Returns e.g. "13 – 19 abr 2026" for the week starting on weekStart.
 */
export function formatWeekLabel(weekStart: string): string {
  const dates = getWeekDates(weekStart)
  const start = new Date(dates[0] + "T00:00:00Z")
  const end = new Date(dates[6] + "T00:00:00Z")

  const startDay = start.getUTCDate()
  const endDay = end.getUTCDate()
  const monthAbbr = MONTHS_ES[end.getUTCMonth()]
  const year = end.getUTCFullYear()

  return `${startDay} – ${endDay} ${monthAbbr} ${year}`
}

/**
 * Returns true if the 1-hour slot [hour*60, hour*60+60) on date for courtId
 * overlaps any reservation in the list.
 *
 * Overlap condition: slotStart < resEnd AND slotEnd > resStart
 */
export function isSlotOccupied(
  reservations: WeekReservation[],
  courtId: string,
  date: string,
  hour: number
): boolean {
  const slotStart = hour * 60
  const slotEnd = slotStart + 60

  return reservations.some((r) => {
    if (r.court_id !== courtId || r.date !== date) return false

    const resStart = parseMinutes(r.start_time)
    const resEnd = parseMinutes(r.end_time)

    return slotStart < resEnd && slotEnd > resStart
  })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

function toDateString(date: Date, mode: "utc" | "local"): string {
  const y = mode === "utc" ? date.getUTCFullYear() : date.getFullYear()
  const mo = mode === "utc" ? date.getUTCMonth() + 1 : date.getMonth() + 1
  const d = mode === "utc" ? date.getUTCDate() : date.getDate()
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}
