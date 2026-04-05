import { z } from "zod"

// ──────────────────────────────────────────────────────────
// Canonical sport identifiers — single source of truth
// ──────────────────────────────────────────────────────────

export const SPORT_IDS = ["pickleball", "padel", "tenis", "futbol"] as const

export type SportId = typeof SPORT_IDS[number]

export const PRIMARY_SPORT: SportId = "pickleball"

// ──────────────────────────────────────────────────────────
// Per-sport configuration
// ──────────────────────────────────────────────────────────

export interface SportConfig {
  id: SportId
  label: string
  emoji: string
  description: string
  players: string
  isPrimary: boolean
}

export const SPORT_CONFIG: Record<SportId, SportConfig> = {
  pickleball: {
    id: "pickleball",
    label: "Pickleball",
    emoji: "🏓",
    description: "El deporte de más rápido crecimiento. Únete a la revolución.",
    players: "2-4 jugadores",
    isPrimary: true,
  },
  padel: {
    id: "padel",
    label: "Pádel",
    emoji: "🎾",
    description: "El deporte de moda. Reserva pistas y encuentra tu pareja ideal.",
    players: "2-4 jugadores",
    isPrimary: false,
  },
  tenis: {
    id: "tenis",
    label: "Tenis",
    emoji: "🏸",
    description: "Clásico y elegante. Compite en torneos locales y mejora tu ranking.",
    players: "1-4 jugadores",
    isPrimary: false,
  },
  futbol: {
    id: "futbol",
    label: "Fútbol",
    emoji: "⚽",
    description: "El deporte rey. Encuentra ligas, equipos y canchas cercanas.",
    players: "2-22 jugadores",
    isPrimary: false,
  },
}

// ──────────────────────────────────────────────────────────
// Zod schema — use wherever sport input must be validated
// ──────────────────────────────────────────────────────────

export const sportSchema = z.enum(SPORT_IDS)

// ──────────────────────────────────────────────────────────
// Derived helpers
// ──────────────────────────────────────────────────────────

/** Flat label map for quick lookups: { futbol: "Fútbol", ... } */
export const SPORT_LABELS: Record<SportId, string> = Object.fromEntries(
  SPORT_IDS.map((id) => [id, SPORT_CONFIG[id].label])
) as Record<SportId, string>

/** Array of { value, label } tuples — useful for select/radio components */
export const SPORT_OPTIONS = SPORT_IDS.map((id) => ({
  value: id,
  label: SPORT_CONFIG[id].label,
}))
