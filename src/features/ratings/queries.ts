import { createServiceClient } from "@/lib/supabase/server"
import type { RankingEntry } from "@/features/ratings/types"
import { getBadgesByUserIds } from "@/features/badges/queries"

export async function getRankingBySport(
  sport?: string,
  limit = 50
): Promise<RankingEntry[]> {
  try {
    const supabase = createServiceClient()

    // LEFT JOIN: profiles → rankings so all users appear even without matches played.
    // Users with no ranking entry show score/wins/losses = 0.
    // When a sport filter is set, only users with a ranking entry for that sport appear.
    if (sport) {
      // Uses get_sport_ranking_with_enrolled so players enrolled in tournaments
      // appear even before they have played any match (score=0 until first game).
      const { data, error } = await supabase.rpc("get_sport_ranking_with_enrolled", {
        p_sport: sport,
        p_limit: limit,
      })

      if (error || !data) return []

      const entries = (data as Array<{
        user_id: string
        username: string | null
        full_name: string | null
        avatar_url: string | null
        score: number
        wins: number
        losses: number
      }>).map((row, index) => ({
        position: index + 1,
        userId: row.user_id,
        username: row.username ?? null,
        fullName: row.full_name ?? "Jugador",
        avatarUrl: row.avatar_url ?? null,
        score: row.score,
        wins: row.wins,
        losses: row.losses,
        badges: [] as import("@/features/badges/constants").BadgeType[],
      }))

      const badgeMap = await getBadgesByUserIds(entries.map((e) => e.userId))
      return entries.map((e) => ({ ...e, badges: (badgeMap[e.userId] ?? []).map((b) => b.badge_type) }))
    }

    // No sport filter: aggregate all sports per user via SQL GROUP BY (Q5)
    const { data, error } = await supabase.rpc("get_global_rankings", { p_limit: limit })
    if (error || !data) return []

    const entries = (data as Array<{
      user_id: string
      username: string | null
      full_name: string | null
      avatar_url: string | null
      score: number
      wins: number
      losses: number
    }>).map((row, index) => ({
      position: index + 1,
      userId: row.user_id,
      username: row.username ?? null,
      fullName: row.full_name ?? "Jugador",
      avatarUrl: row.avatar_url ?? null,
      score: row.score,
      wins: row.wins,
      losses: row.losses,
      badges: [] as import("@/features/badges/constants").BadgeType[],
    }))

    const badgeMap = await getBadgesByUserIds(entries.map((e) => e.userId))
    return entries.map((e) => ({ ...e, badges: (badgeMap[e.userId] ?? []).map((b) => b.badge_type) }))
  } catch {
    return []
  }
}
