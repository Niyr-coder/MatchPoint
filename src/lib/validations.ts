import { z } from "zod"

export const waitlistSchema = z.object({
  email: z
    .string()
    .min(1, "El email es requerido")
    .email("Ingresa un email válido")
    .max(254, "Email demasiado largo"),
  source: z.string().max(50).optional().default("landing_page"),
})

export type WaitlistInput = z.infer<typeof waitlistSchema>

// Re-exports from features (transitional)
export * from "@/features/auth/validations"
export * from "@/features/users/validations"
export * from "@/features/users/constants"
