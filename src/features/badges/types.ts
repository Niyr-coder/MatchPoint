// src/features/badges/types.ts
import type { BadgeType } from "@/features/badges/constants"

export interface PlayerBadge {
  id: string
  badge_type: BadgeType
  club_id: string | null
  club_name: string | null
  granted_by: string
  granted_at: string
}

/** Raw row returned by Supabase PostgREST when selecting from player_badges with clubs join */
export interface RawBadgeRow {
  id: string
  badge_type: string
  club_id: string | null
  granted_by: string
  granted_at: string
  clubs: { name: string } | null
}
