import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import type { ApiResponse } from "@/types"

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
    return NextResponse.json(
      { success: false, data: null, error: "No autenticado" },
      { status: 401 }
    )
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("settings")
    .eq("id", user.id)
    .single()

  if (error) {
    return NextResponse.json(
      { success: false, data: null, error: "Perfil no encontrado" },
      { status: 404 }
    )
  }

  // Validate the stored JSONB against our schema — unknown keys are stripped
  const parsed = settingsSchema.safeParse(data?.settings ?? {})
  const settings: UserSettings = parsed.success ? parsed.data : {}

  return NextResponse.json({ success: true, data: settings, error: null })
}

// ─── PATCH /api/profile/settings ──────────────────────────────────────────────

export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse<UserSettings>>> {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json(
      { success: false, data: null, error: "No autenticado" },
      { status: 401 }
    )
  }

  const rl = await checkRateLimit("profileSettings", user.id, RATE_LIMITS.profileSettings)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas actualizaciones. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Cuerpo de solicitud inválido" },
      { status: 400 }
    )
  }

  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  const supabase = createServiceClient()

  // Read existing settings first so we can merge (partial update)
  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("settings")
    .eq("id", user.id)
    .single()

  if (fetchError) {
    return NextResponse.json(
      { success: false, data: null, error: "Perfil no encontrado" },
      { status: 404 }
    )
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
    return NextResponse.json(
      { success: false, data: null, error: "Error al guardar los ajustes" },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data: merged, error: null })
}
