import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { onboardingSchema } from "@/lib/validations"
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit"
import type { ApiResponse, Profile } from "@/types"
import { ok, fail } from "@/lib/api/response"

const profileUpdateSchema = z.object({
  first_name: z.string().min(1, "El nombre es requerido").max(50).optional(),
  last_name: z.string().min(1, "El apellido es requerido").max(50).optional(),
  phone: z
    .string()
    .min(9, "Mínimo 9 dígitos")
    .max(10, "Máximo 10 dígitos")
    .regex(/^[0-9]+$/, "Solo números")
    .optional(),
  city: z.string().min(1).max(100).optional(),
  province: z.string().min(1).optional(),
  date_of_birth: z.string().optional(),
})

async function getAuthUser() {
  const authClient = await createClient()
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser()
  if (error || !user) return null
  return user
}

export async function GET(
  _req: NextRequest
): Promise<NextResponse<ApiResponse<Profile>>> {
  const user = await getAuthUser()
  if (!user) {
    return fail("No autenticado", 401)
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error || !data) {
    return fail("Perfil no encontrado", 404)
  }

  return ok(data as Profile)
}

export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse<null>>> {
  const rl = await checkRateLimit("profileUpdate", getClientIp(request), RATE_LIMITS.profileUpdate)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta más tarde.", 429)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Cuerpo de solicitud inválido")
  }

  // Try onboarding schema first (full onboarding flow)
  const onboardingParsed = onboardingSchema.safeParse(body)
  if (onboardingParsed.success) {
    const user = await getAuthUser()
    if (!user) {
      return fail("No autenticado", 401)
    }

    const supabase = createServiceClient()
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username: onboardingParsed.data.username,
        first_name: onboardingParsed.data.first_name,
        last_name: onboardingParsed.data.last_name,
        full_name: `${onboardingParsed.data.first_name} ${onboardingParsed.data.last_name}`,
        city: onboardingParsed.data.city,
        province: onboardingParsed.data.province,
        phone: onboardingParsed.data.phone,
        date_of_birth: onboardingParsed.data.date_of_birth,
        preferred_sport: onboardingParsed.data.preferred_sport ?? "pickleball",
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      if (updateError.code === "23505") {
        return fail("Este nombre de usuario ya está en uso.", 409)
      }
      return fail("Error al guardar el perfil. Intenta de nuevo.", 500)
    }

    // If the user provided a dominant hand, upsert the pickleball profile
    const { pickleball_dominant_hand } = onboardingParsed.data
    if (pickleball_dominant_hand !== undefined) {
      await supabase
        .from("pickleball_profiles")
        .upsert(
          { user_id: user.id, dominant_hand: pickleball_dominant_hand, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        )
    }

    return ok(null)
  }

  // Partial profile update (from profile edit form)
  const profileParsed = profileUpdateSchema.safeParse(body)
  if (!profileParsed.success) {
    return fail(profileParsed.error.issues[0].message, 422)
  }

  const user = await getAuthUser()
  if (!user) {
    return fail("No autenticado", 401)
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const d = profileParsed.data

  if (d.first_name !== undefined) updates.first_name = d.first_name
  if (d.last_name !== undefined) updates.last_name = d.last_name
  if (d.phone !== undefined) updates.phone = d.phone
  if (d.city !== undefined) updates.city = d.city
  if (d.province !== undefined) updates.province = d.province
  if (d.date_of_birth !== undefined) updates.date_of_birth = d.date_of_birth

  // Rebuild full_name if first or last changed
  if (d.first_name !== undefined || d.last_name !== undefined) {
    const supabase = createServiceClient()
    const { data: existing } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single()

    if (existing) {
      const firstName = d.first_name ?? (existing.first_name as string) ?? ""
      const lastName = d.last_name ?? (existing.last_name as string) ?? ""
      updates.full_name = `${firstName} ${lastName}`.trim()
    }
  }

  const supabase = createServiceClient()
  const { error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)

  if (updateError) {
    return fail("Error al actualizar el perfil.", 500)
  }

  return ok(null)
}
