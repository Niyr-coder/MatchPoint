import { z } from "zod"
import { SPORT_IDS } from "@/lib/sports/config"

// ──────────────────────────────────────────────────────────
// Pickleball-specific enums — single source of truth
// ──────────────────────────────────────────────────────────

export const PICKLEBALL_SKILL_LEVELS = ["beginner", "intermediate", "advanced", "pro"] as const
export type PickleballSkillLevel = typeof PICKLEBALL_SKILL_LEVELS[number]

export const PICKLEBALL_SKILL_LEVEL_LABELS: Record<PickleballSkillLevel, string> = {
  beginner: "Principiante (1.0–2.5)",
  intermediate: "Intermedio (2.5–4.0)",
  advanced: "Avanzado (4.0–5.5)",
  pro: "Pro (5.5+)",
}

export const PICKLEBALL_PLAY_STYLES = ["singles", "doubles", "both"] as const
export type PickleballPlayStyle = typeof PICKLEBALL_PLAY_STYLES[number]

export const PICKLEBALL_PLAY_STYLE_LABELS: Record<PickleballPlayStyle, string> = {
  singles: "Individuales",
  doubles: "Dobles",
  both: "Ambos",
}

export const DOMINANT_HANDS = ["right", "left", "ambidextrous"] as const
export type DominantHand = typeof DOMINANT_HANDS[number]

export const DOMINANT_HAND_LABELS: Record<DominantHand, string> = {
  right: "Derecha",
  left: "Izquierda",
  ambidextrous: "Ambidiestro",
}

export const waitlistSchema = z.object({
  email: z
    .string()
    .min(1, "El email es requerido")
    .email("Ingresa un email válido")
    .max(254, "Email demasiado largo"),
  source: z.string().max(50).optional().default("landing_page"),
})

export type WaitlistInput = z.infer<typeof waitlistSchema>

export const onboardingSchema = z.object({
  username: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(30, "Máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guión bajo"),
  first_name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(50, "Nombre demasiado largo"),
  last_name: z
    .string()
    .min(1, "El apellido es requerido")
    .max(50, "Apellido demasiado largo"),
  province: z
    .string()
    .min(1, "La provincia es requerida"),
  city: z
    .string()
    .min(1, "La ciudad es requerida")
    .max(100, "Ciudad demasiado larga"),
  phone: z
    .string()
    .min(1, "El teléfono es requerido")
    .min(9, "Teléfono inválido, mínimo 9 dígitos")
    .max(10, "Máximo 10 dígitos")
    .regex(/^[0-9]+$/, "Solo se permiten números"),
  date_of_birth: z
    .string()
    .min(1, "La fecha de nacimiento es requerida")
    .refine((val) => {
      const date = new Date(val)
      return !isNaN(date.getTime())
    }, "Fecha inválida")
    .refine((val) => {
      const dob = new Date(val)
      const today = new Date()
      const age = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()
      const dayDiff = today.getDate() - dob.getDate()
      const exactAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age
      return exactAge >= 14
    }, "Debes tener al menos 14 años"),
  // Sport selection — optional fields added for Pickleball-First MVP
  preferred_sport: z.enum(SPORT_IDS).optional().default("pickleball"),
  pickleball_skill_level: z.enum(PICKLEBALL_SKILL_LEVELS).optional(),
  pickleball_play_style: z.enum(PICKLEBALL_PLAY_STYLES).optional(),
})

export type OnboardingFormInput = z.infer<typeof onboardingSchema>

// ──────────────────────────────────────────────────────────
// Pickleball profile upsert schema (used by AccountForm)
// ──────────────────────────────────────────────────────────

export const pickleballProfileSchema = z.object({
  skill_level: z.enum(PICKLEBALL_SKILL_LEVELS).optional(),
  dominant_hand: z.enum(DOMINANT_HANDS).optional(),
  play_style: z.enum(PICKLEBALL_PLAY_STYLES).optional(),
})

export type PickleballProfileInput = z.infer<typeof pickleballProfileSchema>
