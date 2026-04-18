import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import type { ApiResponse } from "@/types"
import { ok, fail } from "@/lib/api/response"

// ─── Validation schema ─────────────────────────────────────────────────────────

export const settingsSchema = z.object({
  notif_reservas: z.boolean().optional(),
  notif_recordatorios: z.boolean().optional(),
  notif_torneos: z.boolean().optional(),
  notif_mensajes: z.boolean().optional(),
  tema: z.enum(["auto", "claro", "oscuro"]).optional(),
  perfil_publico: z.boolean().optional(),
  mostrar_estadisticas: z.boolean().optional(),
  mostrar_ranking: z.boolean().optional(),
  idioma: z.enum(["es", "en"]).optional(),
})

export type UserSettings = z.infer<typeof settingsSchema>

// ─── Auth helper ───────────────────────────────────────────────────────────────

async function getAuthUser() {
  const authClient = await createClient()
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser()
  if (error || !user) return null
  return user
}

// ─── GET /api/profile/settings ─────────────────────────────────────────────────

export async function GET(
  _req: NextRequest
): Promise<NextResponse<ApiResponse<UserSettings>>> {
  const user = await getAuthUser()
  if (!user) {
    return fail("No autenticado", 401)
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("settings")
    .eq("id", user.id)
    .single()

  if (error) {
    return fail("Perfil no encontrado", 404)
  }

  // Validate the stored JSONB against our schema — unknown keys are stripped
  const parsed = settingsSchema.safeParse(data?.settings ?? {})
  const settings: UserSettings = parsed.success ? parsed.data : {}

  return ok(settings)
}

// ─── PATCH /api/profile/settings ──────────────────────────────────────────────

export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse<UserSettings>>> {
  const user = await getAuthUser()
  if (!user) {
    return fail("No autenticado", 401)
  }

  const rl = await checkRateLimit("profileSettings", user.id, RATE_LIMITS.profileSettings)
  if (!rl.allowed) {
    return fail("Demasiadas actualizaciones. Intenta más tarde.", 429)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Cuerpo de solicitud inválido")
  }

  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  const supabase = createServiceClient()

  // Read existing settings first so we can merge (partial update)
  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("settings")
    .eq("id", user.id)
    .single()

  if (fetchError) {
    return fail("Perfil no encontrado", 404)
  }

  const merged: UserSettings = {
    ...(existing?.settings as UserSettings | null ?? {}),
    ...parsed.data,
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ settings: merged, updated_at: new Date().toISOString() })
    .eq("id", user.id)

  if (updateError) {
    return fail("Error al guardar los ajustes", 500)
  }

  return ok(merged)
}
