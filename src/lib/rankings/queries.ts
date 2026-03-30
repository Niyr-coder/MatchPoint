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
        .select("user_id, score, wins, losses, profiles!inner(full_name, avatar_url)")
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

    // No sport filter: show all profiles, joined with their ranking score (or 0)
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, rankings(score, wins, losses)")
      .order("id")
      .limit(limit)

    if (error || !data) return []

    type ProfileRow = {
      id: string
      full_name: string | null
      avatar_url: string | null
      rankings: { score: number; wins: number; losses: number }[] | null
    }

    const rows = (data as ProfileRow[]).map(p => {
      const r = Array.isArray(p.rankings) ? p.rankings[0] : null
      return {
        userId: p.id,
        fullName: p.full_name ?? "Jugador",
        avatarUrl: p.avatar_url ?? null,
        score: r?.score ?? 0,
        wins: r?.wins ?? 0,
        losses: r?.losses ?? 0,
      }
    })

    // Sort by score desc, then wins desc
    rows.sort((a, b) => b.score - a.score || b.wins - a.wins)

    return rows.map((r, index) => ({ ...r, position: index + 1 }))
  } catch {
    return []
  }
}
