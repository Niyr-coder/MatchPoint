// src/features/badges/constants.ts
import type { AppPermission } from "@/features/auth/types"

export const BADGE_TYPES = [
  "organizador_verificado",
  "vip",
  "arbitro",
  "embajador",
  "capitan",
] as const

export type BadgeType = (typeof BADGE_TYPES)[number]

export interface BadgeConfig {
  label: string
  emoji: string
  color: string
  canBeClubScoped: boolean
  adminOnly: boolean
}

export const BADGE_CONFIG: Record<BadgeType, BadgeConfig> = {
  organizador_verificado: {
    label: "Organizador Verificado",
    emoji: "🏆",
    color: "bg-green-50 border-green-200 text-green-800",
    canBeClubScoped: true,
    adminOnly: true,
  },
  vip: {
    label: "Jugador VIP",
    emoji: "👑",
    color: "bg-yellow-50 border-yellow-200 text-yellow-800",
    canBeClubScoped: false,
    adminOnly: true,
  },
  arbitro: {
    label: "Árbitro",
    emoji: "⚖️",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    canBeClubScoped: true,
    adminOnly: false,
  },
  embajador: {
    label: "Embajador del Club",
    emoji: "⭐",
    color: "bg-purple-50 border-purple-200 text-purple-800",
    canBeClubScoped: true,
    adminOnly: false,
  },
  capitan: {
    label: "Capitán de Equipo",
    emoji: "🎯",
    color: "bg-orange-50 border-orange-200 text-orange-800",
    canBeClubScoped: true,
    adminOnly: false,
  },
}

export const BADGE_PERMISSION_MAP: Record<BadgeType, AppPermission[]> = {
  organizador_verificado: ["tournaments.create", "tournaments.manage", "tournaments.view"],
  vip:                    ["reservations.create", "shop.purchase"],
  arbitro:                ["tournaments.view", "reservations.checkin"],
  embajador:              ["users.view", "leaderboard.view", "reports.view_limited"],
  capitan:                ["team.manage", "reservations.create"],
}

export const CLUB_BADGE_TYPES: BadgeType[] = BADGE_TYPES.filter(
  (t) => !BADGE_CONFIG[t].adminOnly
)
