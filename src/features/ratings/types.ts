import type { BadgeType } from "@/features/badges/constants"

export interface RankingEntry {
  position: number
  userId: string
  username: string | null
  fullName: string
  avatarUrl: string | null
  score: number
  wins: number
  losses: number
  badges: BadgeType[]
}
