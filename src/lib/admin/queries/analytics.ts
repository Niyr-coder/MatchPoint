import { createServiceClient } from "@/lib/supabase/server"
import type { AdminAnalytics, PlatformAnalytics } from "./types"

// ---- helpers -------------------------------------------------------

export function monthLabel(date: Date): string {
  return date.toLocaleDateString("es-EC", { month: "short", year: "2-digit" })
}

export function last6MonthsRange(): { start: Date; months: Date[] } {
  const now = new Date()
  const months: Date[] = []
  for (let i = 5; i >= 0; i--) {
    months.push(new Date(now.getFullYear(), now.getMonth() - i, 1))
  }
  return { start: months[0], months }
}

// ---- getPlatformAnalytics ------------------------------------------

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  try {
    const supabase = createServiceClient()

    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0]

    // Last 7 days for activity chart
    const day0 = new Date(now); day0.setDate(now.getDate() - 6); day0.setHours(0, 0, 0, 0)

    const [
      usersRes,
      clubsRes,
      reservationsRes,
      tournamentsRes,
      newUsersRes,
      reservationsMonthRes,
      activityRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("clubs").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("reservations").select("id", { count: "exact", head: true }).neq("status", "cancelled"),
      supabase.from("tournaments").select("id", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", firstOfMonth),
      supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", firstOfMonth)
        .neq("status", "cancelled"),
      supabase
        .from("reservations")
        .select("created_at")
        .gte("created_at", day0.toISOString())
        .neq("status", "cancelled"),
    ])

    // Build 7-day activity bars from raw reservation timestamps
    const DAY_LABELS = ["D", "L", "M", "X", "J", "V", "S"]
    const activityLast7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(day0); d.setDate(day0.getDate() + i)
      const dateStr = d.toISOString().split("T")[0]
      const count = (activityRes.data ?? []).filter(
        (r) => r.created_at.startsWith(dateStr)
      ).length
      return { day: DAY_LABELS[d.getDay()], value: count }
    })

    return {
      totalUsers: usersRes.count ?? 0,
      totalClubs: clubsRes.count ?? 0,
      totalReservations: reservationsRes.count ?? 0,
      totalTournaments: tournamentsRes.count ?? 0,
      newUsersThisMonth: newUsersRes.count ?? 0,
      reservationsThisMonth: reservationsMonthRes.count ?? 0,
      activityLast7Days,
    }
  } catch {
    return {
      totalUsers: 0,
      totalClubs: 0,
      totalReservations: 0,
      totalTournaments: 0,
      newUsersThisMonth: 0,
      reservationsThisMonth: 0,
      activityLast7Days: [],
    }
  }
}

// ---- getAdminAnalytics ---------------------------------------------

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const EMPTY: AdminAnalytics = {
    usersByMonth: [],
    reservationsByMonth: [],
    topClubs: [],
    tournamentsByStatus: [],
    totalRevenue: 0,
    revenueThisMonth: 0,
  }

  try {
    const supabase = createServiceClient()
    const { start, months } = last6MonthsRange()

    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [usersRes, reservationsRes, clubsRes, tournamentsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", start.toISOString()),
      supabase
        .from("reservations")
        .select("created_at, total_price, club_id")
        .gte("created_at", start.toISOString())
        .neq("status", "cancelled"),
      supabase.from("clubs").select("id, name"),
      supabase.from("tournaments").select("status"),
    ])

    // --- usersByMonth
    const usersByMonth = months.map((m) => {
      const next = new Date(m.getFullYear(), m.getMonth() + 1, 1)
      const count = (usersRes.data ?? []).filter((u) => {
        const d = new Date(u.created_at)
        return d >= m && d < next
      }).length
      return { month: monthLabel(m), count }
    })

    // --- reservationsByMonth
    const reservationsByMonth = months.map((m) => {
      const next = new Date(m.getFullYear(), m.getMonth() + 1, 1)
      const rows = (reservationsRes.data ?? []).filter((r) => {
        const d = new Date(r.created_at)
        return d >= m && d < next
      })
      const revenue = rows.reduce((sum, r) => sum + (Number(r.total_price) || 0), 0)
      return { month: monthLabel(m), count: rows.length, revenue }
    })

    // --- topClubs
    const clubMap: Record<string, number> = {}
    for (const r of reservationsRes.data ?? []) {
      if (r.club_id) clubMap[r.club_id] = (clubMap[r.club_id] ?? 0) + 1
    }
    const clubsById: Record<string, string> = {}
    for (const c of clubsRes.data ?? []) clubsById[c.id] = c.name
    const topClubs = Object.entries(clubMap)
      .map(([club_id, reservation_count]) => ({
        club_id,
        name: clubsById[club_id] ?? club_id,
        reservation_count,
      }))
      .sort((a, b) => b.reservation_count - a.reservation_count)
      .slice(0, 5)

    // --- tournamentsByStatus
    const statusMap: Record<string, number> = {}
    for (const t of tournamentsRes.data ?? []) {
      statusMap[t.status] = (statusMap[t.status] ?? 0) + 1
    }
    const tournamentsByStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }))

    // --- revenue
    const allRevRows = (reservationsRes.data ?? [])
    const totalRevenue = allRevRows.reduce((sum, r) => sum + (Number(r.total_price) || 0), 0)
    const revenueThisMonth = allRevRows
      .filter((r) => new Date(r.created_at) >= new Date(firstOfMonth))
      .reduce((sum, r) => sum + (Number(r.total_price) || 0), 0)

    return { usersByMonth, reservationsByMonth, topClubs, tournamentsByStatus, totalRevenue, revenueThisMonth }
  } catch {
    return EMPTY
  }
}
