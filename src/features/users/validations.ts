import { z } from "zod"
import { PICKLEBALL_SKILL_LEVELS, DOMINANT_HANDS, PICKLEBALL_PLAY_STYLES } from "@/features/users/constants"

export const pickleballProfileSchema = z.object({
  skill_level: z.enum(PICKLEBALL_SKILL_LEVELS).optional(),
  dominant_hand: z.enum(DOMINANT_HANDS).optional(),
  play_style: z.enum(PICKLEBALL_PLAY_STYLES).optional(),
})

export type PickleballProfileInput = z.infer<typeof pickleballProfileSchema>
