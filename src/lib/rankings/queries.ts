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

    // Use the rankings table (populated when match results are recorded)
    // Eliminates the 500-profile full-scan and incorrect losses calculation
    let query = supabase
      .from("rankings")
      .select("user_id, score, wins, losses, profiles!inner(full_name, avatar_url)")
      .order("score", { ascending: false })
      .order("wins", { ascending: false })
      .limit(limit)

    if (sport) {
      query = query.eq("sport", sport)
    }

    const { data, error } = await query
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
  } catch {
    return []
  }
}
