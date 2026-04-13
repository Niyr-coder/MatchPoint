import { createServiceClient } from "@/lib/supabase/server"
import type { AdminFinancials } from "./types"

// ---- getAdminFinancials --------------------------------------------

export async function getAdminFinancials(): Promise<AdminFinancials> {
  const EMPTY: AdminFinancials = {
    totalRevenue: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0,
    totalReservations: 0,
    reservationsThisMonth: 0,
    avgReservationValue: 0,
    topClubsByRevenue: [],
    tournamentRevenue: 0,
  }

  try {
    const supabase = createServiceClient()

    const now = new Date()
    const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const firstLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

    const [reservationsRes, clubsRes, tournamentParticipantsRes] = await Promise.all([
      supabase
        .from("reservations")
        .select("created_at, total_price, club_id")
        .neq("status", "cancelled"),
      supabase.from("clubs").select("id, name"),
      supabase
        .from("tournament_participants")
        .select("tournament_id, tournaments(entry_fee)")
        .eq("payment_status", "paid"),
    ])

    const rows = reservationsRes.data ?? []

    const totalRevenue = rows.reduce((s, r) => s + (Number(r.total_price) || 0), 0)
    const totalReservations = rows.length

    const thisMonthRows = rows.filter((r) => new Date(r.created_at) >= new Date(firstThisMonth))
    const lastMonthRows = rows.filter((r) => {
      const d = new Date(r.created_at)
      return d >= new Date(firstLastMonth) && d < new Date(firstThisMonth)
    })

    const revenueThisMonth = thisMonthRows.reduce((s, r) => s + (Number(r.total_price) || 0), 0)
    const revenueLastMonth = lastMonthRows.reduce((s, r) => s + (Number(r.total_price) || 0), 0)
    const reservationsThisMonth = thisMonthRows.length
    const avgReservationValue = totalReservations > 0 ? totalRevenue / totalReservations : 0

    // top clubs by revenue
    const clubRevMap: Record<string, { revenue: number; reservations: number }> = {}
    for (const r of rows) {
      if (!r.club_id) continue
      const cur = clubRevMap[r.club_id] ?? { revenue: 0, reservations: 0 }
      clubRevMap[r.club_id] = {
        revenue: cur.revenue + (Number(r.total_price) || 0),
        reservations: cur.reservations + 1,
      }
    }
    const clubsById: Record<string, string> = {}
    for (const c of clubsRes.data ?? []) clubsById[c.id] = c.name
    const topClubsByRevenue = Object.entries(clubRevMap)
      .map(([club_id, v]) => ({ club_id, name: clubsById[club_id] ?? club_id, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // tournament revenue
    const tournamentRevenue = (tournamentParticipantsRes.data ?? []).reduce((s, p) => {
      const fee = Number((p.tournaments as { entry_fee?: number } | null)?.entry_fee ?? 0)
      return s + fee
    }, 0)

    return {
      totalRevenue,
      revenueThisMonth,
      revenueLastMonth,
      totalReservations,
      reservationsThisMonth,
      avgReservationValue,
      topClubsByRevenue,
      tournamentRevenue,
    }
  } catch {
    return EMPTY
  }
}
