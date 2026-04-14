// src/features/badges/queries.ts
import { createServiceClient } from "@/lib/supabase/server"
import type { PlayerBadge } from "@/features/badges/types"
import type { BadgeType } from "@/features/badges/constants"

interface RawBadgeRow {
  id: string
  badge_type: string
  club_id: string | null
  granted_by: string
  granted_at: string
  clubs: { name: string } | null
}

export async function getPlayerBadges(userId: string): Promise<PlayerBadge[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("player_badges")
    .select("id, badge_type, club_id, granted_by, granted_at, clubs(name)")
    .eq("user_id", userId)
    .order("granted_at", { ascending: false })

  if (error || !data) return []

  return (data as unknown as RawBadgeRow[]).map((row) => ({
    id: row.id,
    badge_type: row.badge_type as BadgeType,
    club_id: row.club_id,
    club_name: row.clubs?.name ?? null,
    granted_by: row.granted_by,
    granted_at: row.granted_at,
  }))
}

export async function getBadgesByUserIds(
  userIds: string[]
): Promise<Record<string, PlayerBadge[]>> {
  if (userIds.length === 0) return {}

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("player_badges")
    .select("id, badge_type, club_id, granted_by, granted_at, user_id, clubs(name)")
    .in("user_id", userIds)

  if (error || !data) return {}

  const result: Record<string, PlayerBadge[]> = {}
  for (const row of data as unknown as (RawBadgeRow & { user_id: string })[]) {
    const entry: PlayerBadge = {
      id: row.id,
      badge_type: row.badge_type as BadgeType,
      club_id: row.club_id,
      club_name: row.clubs?.name ?? null,
      granted_by: row.granted_by,
      granted_at: row.granted_at,
    }
    ;(result[row.user_id] ??= []).push(entry)
  }
  return result
}
