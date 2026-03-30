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

    // All registered users
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .limit(500)

    if (profilesError || !profiles) return []

    // Tournament participation stats (left-join done in JS)
    let participantsQuery = supabase
      .from("tournament_participants")
      .select("user_id, status, tournaments!inner(sport)")
      .in("status", ["winner", "confirmed", "eliminated", "registered"])

    if (sport) {
      participantsQuery = participantsQuery.eq("tournaments.sport", sport)
    }

    const { data: participants } = await participantsQuery

    // Build stats map from participation data
    const statsMap = new Map<string, { wins: number; participations: number }>()
    for (const row of participants ?? []) {
      const userId = row.user_id as string
      const isWinner = row.status === "winner"
      const prev = statsMap.get(userId) ?? { wins: 0, participations: 0 }
      statsMap.set(userId, {
        wins: prev.wins + (isWinner ? 1 : 0),
        participations: prev.participations + 1,
      })
    }

    // Merge profiles with stats, rank all users
    return profiles
      .map((p) => {
        const stats = statsMap.get(p.id) ?? { wins: 0, participations: 0 }
        return {
          userId: p.id,
          fullName: p.full_name ?? "Jugador",
          avatarUrl: p.avatar_url ?? null,
          wins: stats.wins,
          losses: stats.participations - stats.wins,
          score: stats.wins * 10 + stats.participations * 2,
        }
      })
      .sort((a, b) => b.score - a.score || b.wins - a.wins)
      .slice(0, limit)
      .map((entry, index) => ({ ...entry, position: index + 1 }))
  } catch {
    return []
  }
}
