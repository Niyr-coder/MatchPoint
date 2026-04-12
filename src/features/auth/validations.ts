import { z } from "zod"
import { SPORT_IDS } from "@/lib/sports/config"
import { DOMINANT_HANDS } from "@/features/users/constants"

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
  pickleball_dominant_hand: z.enum(DOMINANT_HANDS).optional(),
})

export type OnboardingFormInput = z.infer<typeof onboardingSchema>
