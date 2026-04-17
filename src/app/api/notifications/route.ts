import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import type { ApiResponse } from "@/types"

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  read: boolean
  metadata: Record<string, unknown>
  created_at: string
}

// ──────────────────────────────────────────────────────────
// Validation schemas
// ──────────────────────────────────────────────────────────

const patchByIdsSchema = z.object({
  ids: z.array(z.string().uuid("ID de notificación inválido")).min(1, "Se requiere al menos un ID"),
  all: z.undefined(),
})

const patchAllSchema = z.object({
  all: z.literal(true),
  ids: z.undefined(),
})

const patchSchema = z.union([patchByIdsSchema, patchAllSchema])

// ──────────────────────────────────────────────────────────
// GET — list the authenticated user's notifications (newest first, limit 20)
// RLS on the notifications table guarantees users only see their own rows.
// ──────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest
): Promise<NextResponse<ApiResponse<Notification[]>>> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { success: false, data: null, error: "No autenticado" },
      { status: 401 }
    )
  }

  const rl = await checkRateLimit("notificationsRead", user.id, RATE_LIMITS.notificationsRead)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, type, title, body, read, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) throw new Error(error.message)

    return NextResponse.json({
      success: true,
      data: (data ?? []) as Notification[],
      error: null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[GET /api/notifications]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener las notificaciones" },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────
// PATCH — mark notifications as read
// Body: { ids: string[] }  — mark specific IDs as read
//       { all: true }      — mark all user notifications as read
// RLS guarantees users can only update their own rows.
// ──────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse<null>>> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { success: false, data: null, error: "No autenticado" },
      { status: 401 }
    )
  }

  const rlPatch = await checkRateLimit("notificationsUpdate", user.id, RATE_LIMITS.notificationsUpdate)
  if (!rlPatch.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes" },
      { status: 429, headers: { "Retry-After": String(rlPatch.retryAfterSeconds) } }
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

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  try {
    if (parsed.data.all === true) {
      // Mark every unread notification for this user as read
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false)

      if (error) throw new Error(error.message)
    } else {
      // Mark only the requested IDs as read.
      // The .eq("user_id") filter is belt-and-suspenders alongside RLS.
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", parsed.data.ids)
        .eq("user_id", user.id)

      if (error) throw new Error(error.message)
    }

    return NextResponse.json({ success: true, data: null, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[PATCH /api/notifications]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al actualizar las notificaciones" },
      { status: 500 }
    )
  }
}
