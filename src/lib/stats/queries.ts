import { createClient } from "@/lib/supabase/server"

export interface PlayerStats {
  reservationsThisMonth: number
  totalReservations: number
  tournamentsPlayed: number
  tournamentsWon: number
  rankingScore: number
}

export async function getPlayerStats(userId: string): Promise<PlayerStats> {
  const supabase = await createClient()

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]

  const [monthRes, totalRes, tournamentsRes, winsRes] = await Promise.all([
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("date", firstOfMonth)
      .neq("status", "cancelled"),

    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("status", "cancelled"),

    supabase
      .from("tournament_participants")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),

    supabase
      .from("tournament_participants")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "winner"),
  ])

  if (monthRes.error) throw new Error(monthRes.error.message)
  if (totalRes.error) throw new Error(totalRes.error.message)
  if (tournamentsRes.error) throw new Error(tournamentsRes.error.message)
  if (winsRes.error) throw new Error(winsRes.error.message)

  const tournamentsPlayed = tournamentsRes.count ?? 0
  const tournamentsWon = winsRes.count ?? 0

  // Ranking proxy: wins * 10 + participations * 2 + reservas * 1
  const rankingScore =
    tournamentsWon * 10 +
    tournamentsPlayed * 2 +
    (totalRes.count ?? 0)

  return {
    reservationsThisMonth: monthRes.count ?? 0,
    totalReservations: totalRes.count ?? 0,
    tournamentsPlayed,
    tournamentsWon,
    rankingScore,
  }
}
