import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { logAdminAction } from "@/lib/audit/log"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import type { ApiResponse } from "@/types"
import { ok, fail } from "@/lib/api/response"

// ── types ──────────────────────────────────────────────────────────────────────

export type PlatformSettings = {
  maintenance_mode: boolean
  platform_version: string
  platform_region: string
  platform_currency: string
  // Notification toggles
  notify_on_new_reservation: boolean
  notify_user_on_confirmed: boolean
  notify_user_on_cancelled: boolean
}

// ── validation ─────────────────────────────────────────────────────────────────

const patchSchema = z
  .object({
    maintenance_mode:           z.boolean().optional(),
    platform_version:           z.string().min(1).max(50).optional(),
    platform_region:            z.string().min(1).max(100).optional(),
    platform_currency:          z.string().min(1).max(10).optional(),
    notify_on_new_reservation:  z.boolean().optional(),
    notify_user_on_confirmed:   z.boolean().optional(),
    notify_user_on_cancelled:   z.boolean().optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Se debe actualizar al menos una configuración",
  })

// ── GET /api/admin/settings ────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse<ApiResponse<PlatformSettings>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("platform_settings")
      .select("key, value")

    if (error) throw new Error(error.message)

    const rows = (data ?? []) as { key: string; value: unknown }[]
    const settings = rows.reduce<Record<string, unknown>>((acc, row) => {
      return { ...acc, [row.key]: row.value }
    }, {})

    return ok(settings as PlatformSettings)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[settings] GET failed:", message)
    return fail("Error al obtener la configuración", 500)
  }
}

// ── PATCH /api/admin/settings ──────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse<null>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  const ctx = authResult.context
  const rl = await checkRateLimit("adminSettings", ctx.userId, RATE_LIMITS.adminSettings)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta más tarde.", 429)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Cuerpo de solicitud inválido")
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  try {
    const supabase = createServiceClient()
    const updates = Object.entries(parsed.data) as [string, unknown][]

    // Upsert each key individually to match the key-value table design
    const upsertPromises = updates.map(([key, value]) =>
      supabase.from("platform_settings").upsert(
        {
          key,
          value: JSON.stringify(value),
          updated_by: authResult.context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      )
    )

    const results = await Promise.all(upsertPromises)
    const firstError = results.find((r) => r.error)
    if (firstError?.error) throw new Error(firstError.error.message)

    await logAdminAction({
      action: "settings.updated",
      entityType: "platform_settings",
      actorId: authResult.context.userId,
      details: { keys: Object.keys(parsed.data) },
    })

    return ok(null)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[settings] PATCH failed:", message)
    return fail("Error al guardar la configuración", 500)
  }
}
