import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { pickleballProfileSchema } from "@/lib/validations"
import type { ApiResponse, PickleballProfile } from "@/types"
import { ok, fail } from "@/lib/api/response"

// ──────────────────────────────────────────────────────────
// Helper: resolve authenticated user or return 401
// ──────────────────────────────────────────────────────────

async function getAuthUser() {
  const authClient = await createClient()
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser()
  if (error || !user) return null
  return user
}

// ──────────────────────────────────────────────────────────
// GET /api/pickleball-profile
// Returns the pickleball profile for the authenticated user.
// ──────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest
): Promise<NextResponse<ApiResponse<PickleballProfile | null>>> {
  const user = await getAuthUser()
  if (!user) {
    return fail("No autenticado", 401)
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("pickleball_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    return fail("Error al obtener el perfil de Pickleball.", 500)
  }

  // No profile yet — return null data with success so the client can show empty state
  return ok(data as PickleballProfile | null)
}

// ──────────────────────────────────────────────────────────
// PUT /api/pickleball-profile
// Upserts skill_level, dominant_hand, and play_style for the
// authenticated user. Rating fields are intentionally excluded
// from this endpoint — they must be updated via service_role
// by the ranking engine to prevent self-inflation.
// ──────────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest
): Promise<NextResponse<ApiResponse<null>>> {
  const user = await getAuthUser()
  if (!user) {
    return fail("No autenticado", 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Cuerpo de solicitud inválido")
  }

  const parsed = pickleballProfileSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Datos inválidos", 422)
  }

  const { skill_level, dominant_hand, play_style } = parsed.data

  // Build the upsert payload — only include fields that were provided
  const upsertPayload: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  }
  if (skill_level !== undefined) upsertPayload.skill_level = skill_level
  if (dominant_hand !== undefined) upsertPayload.dominant_hand = dominant_hand
  if (play_style !== undefined) upsertPayload.play_style = play_style

  const supabase = createServiceClient()
  const { error: upsertError } = await supabase
    .from("pickleball_profiles")
    .upsert(upsertPayload, { onConflict: "user_id" })

  if (upsertError) {
    return fail("Error al guardar el perfil de Pickleball.", 500)
  }

  return ok(null)
}
