import { createServiceClient } from "@/lib/supabase/server"

export interface RankingEntry {
  position: number
  userId: string
  fullName: string
  avatarUrl: string | null
  score: number
  wins: number
  losses: number
}

export async function getRankingBySport(
  sport?: string,
  limit = 50
): Promise<RankingEntry[]> {
  try {
    const supabase = await createServiceClient()

    let query = supabase
      .from("tournament_participants")
      .select(`
        user_id,
        status,
        tournaments!inner(sport),
        profiles!inner(full_name, avatar_url)
      `)
      .in("status", ["winner", "confirmed", "eliminated", "registered"])

    if (sport) {
      query = query.eq("tournaments.sport", sport)
    }

    const { data, error } = await query

    if (error || !data) return []

    const statsMap = new Map<string, {
      userId: string
      fullName: string
      avatarUrl: string | null
      wins: number
      participations: number
    }>()

    for (const row of data) {
      const userId = row.user_id as string
      const profileRaw = row.profiles as unknown
      const profile = profileRaw as { full_name: string | null; avatar_url: string | null } | null
      const isWinner = row.status === "winner"

      const existing = statsMap.get(userId)
      if (existing) {
        statsMap.set(userId, {
          ...existing,
          wins: existing.wins + (isWinner ? 1 : 0),
          participations: existing.participations + 1,
        })
      } else {
        statsMap.set(userId, {
          userId,
          fullName: profile?.full_name ?? "Jugador",
          avatarUrl: profile?.avatar_url ?? null,
          wins: isWinner ? 1 : 0,
          participations: 1,
        })
      }
    }

    const ranked = [...statsMap.values()]
      .map((entry) => ({
        ...entry,
        score: entry.wins * 10 + entry.participations * 2,
        losses: entry.participations - entry.wins,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry, index) => ({
        position: index + 1,
        userId: entry.userId,
        fullName: entry.fullName,
        avatarUrl: entry.avatarUrl,
        score: entry.score,
        wins: entry.wins,
        losses: entry.losses,
      }))

    return ranked
  } catch {
    return []
  }
}
