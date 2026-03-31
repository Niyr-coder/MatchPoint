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

    // LEFT JOIN: profiles → rankings so all users appear even without matches played.
    // Users with no ranking entry show score/wins/losses = 0.
    // When a sport filter is set, only users with a ranking entry for that sport appear.
    if (sport) {
      const { data, error } = await supabase
        .from("rankings")
        .select("user_id, score, wins, losses, profiles!rankings_user_profile_fk(full_name, avatar_url)")
        .eq("sport", sport)
        .order("score", { ascending: false })
        .order("wins", { ascending: false })
        .limit(limit)

      if (error || !data) return []

      return data.map((row, index) => {
        const profile = (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles) as
          | { full_name: string | null; avatar_url: string | null }
          | null
        return {
          position: index + 1,
          userId: row.user_id as string,
          fullName: profile?.full_name ?? "Jugador",
          avatarUrl: profile?.avatar_url ?? null,
          score: row.score,
          wins: row.wins,
          losses: row.losses,
        }
      })
    }

    // No sport filter: two queries then merge (rankings.user_id → auth.users, not profiles)
    const [profilesRes, rankingsRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, avatar_url").limit(limit),
      supabase.from("rankings").select("user_id, score, wins, losses"),
    ])

    if (profilesRes.error || !profilesRes.data) return []

    type RankMap = Record<string, { score: number; wins: number; losses: number }>
    const rankMap: RankMap = {}
    for (const r of rankingsRes.data ?? []) {
      const uid = r.user_id as string
      rankMap[uid] = {
        score: (rankMap[uid]?.score ?? 0) + (r.score as number),
        wins:  (rankMap[uid]?.wins  ?? 0) + (r.wins  as number),
        losses:(rankMap[uid]?.losses ?? 0) + (r.losses as number),
      }
    }

    const rows = profilesRes.data.map(p => ({
      userId: p.id as string,
      fullName: (p.full_name as string | null) ?? "Jugador",
      avatarUrl: (p.avatar_url as string | null) ?? null,
      score:  rankMap[p.id]?.score  ?? 0,
      wins:   rankMap[p.id]?.wins   ?? 0,
      losses: rankMap[p.id]?.losses ?? 0,
    }))

    rows.sort((a, b) => b.score - a.score || b.wins - a.wins)
    return rows.map((r, index) => ({ ...r, position: index + 1 }))
  } catch {
    return []
  }
}
