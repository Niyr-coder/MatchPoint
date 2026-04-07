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
