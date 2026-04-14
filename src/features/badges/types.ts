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
