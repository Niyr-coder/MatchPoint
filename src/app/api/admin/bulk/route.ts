import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { logAdminAction } from "@/lib/audit/log"
import type { ApiResponse } from "@/types"

// ── Validation ───────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const bulkSchema = z.object({
  action: z.string().min(1, "La acción es requerida"),
  entity_type: z.enum(["user", "club"], {
    message: "entity_type debe ser 'user' o 'club'",
  }),
  ids: z
    .array(z.string().regex(UUID_REGEX, "ID inválido — se esperaba un UUID"))
    .min(1, "Se requiere al menos un ID")
    .max(50, "Máximo 50 IDs por operación"),
})

type BulkPayload = z.infer<typeof bulkSchema>

// ── Result shape ──────────────────────────────────────────────────────────────

interface BulkResult {
  success_count: number
  failed_ids: string[]
}

// ── User actions ──────────────────────────────────────────────────────────────

async function handleUserBulk(
  payload: BulkPayload,
  actorId: string
): Promise<BulkResult> {
  const supabase = createServiceClient()
  const { action, ids } = payload
  const failedIds: string[] = []
  let successCount = 0

  if (action === "suspend") {
    // Fetch profiles to get current roles and skip admins
    const { data: profiles, error: fetchError } = await supabase
      .from("profiles")
      .select("id, global_role, settings")
      .in("id", ids)

    if (fetchError) throw new Error(fetchError.message)

    for (const profile of profiles ?? []) {
      if (profile.global_role === "admin") {
        failedIds.push(profile.id)
        continue
      }
      const currentSettings = (profile.settings as Record<string, unknown> | null) ?? {}
      const updatedSettings = {
        ...currentSettings,
        suspended_from_role: profile.global_role,
      }
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          global_role: "user",
          settings: updatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (updateError) {
        failedIds.push(profile.id)
        continue
      }
      successCount++
    }

    await logAdminAction({
      action: "bulk.suspend",
      entityType: "users",
      actorId,
      details: { count: successCount, ids },
    })
  } else if (action === "unsuspend") {
    const { data: profiles, error: fetchError } = await supabase
      .from("profiles")
      .select("id, global_role, settings")
      .in("id", ids)

    if (fetchError) throw new Error(fetchError.message)

    for (const profile of profiles ?? []) {
      const currentSettings = (profile.settings as Record<string, unknown> | null) ?? {}
      const previousRole = (currentSettings.suspended_from_role as string | undefined) ?? "user"
      const { suspended_from_role: _removed, ...cleanedSettings } = currentSettings

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          global_role: previousRole,
          settings: cleanedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (updateError) {
        failedIds.push(profile.id)
        continue
      }
      successCount++
    }

    await logAdminAction({
      action: "bulk.unsuspend",
      entityType: "users",
      actorId,
      details: { count: successCount, ids },
    })
  } else if (action === "delete") {
    for (const id of ids) {
      if (id === actorId) {
        failedIds.push(id)
        continue
      }
      const { error: deleteError } = await supabase.auth.admin.deleteUser(id)
      if (deleteError) {
        failedIds.push(id)
        continue
      }
      successCount++
    }

    await logAdminAction({
      action: "bulk.delete",
      entityType: "users",
      actorId,
      details: { count: successCount, ids },
    })
  } else {
    throw new Error(`Acción desconocida para usuarios: ${action}`)
  }

  return { success_count: successCount, failed_ids: failedIds }
}

// ── Club actions ──────────────────────────────────────────────────────────────

async function handleClubBulk(
  payload: BulkPayload,
  actorId: string
): Promise<BulkResult> {
  const supabase = createServiceClient()
  const { action, ids } = payload

  if (action !== "activate" && action !== "deactivate") {
    throw new Error(`Acción desconocida para clubs: ${action}`)
  }

  const isActive = action === "activate"

  const { error: updateError, count } = await supabase
    .from("clubs")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .in("id", ids)

  if (updateError) throw new Error(updateError.message)

  const successCount = count ?? 0

  await logAdminAction({
    action: `bulk.${action}`,
    entityType: "clubs",
    actorId,
    details: { count: successCount, ids },
  })

  return { success_count: successCount, failed_ids: [] }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<BulkResult>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
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

  const parsed = bulkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  try {
    const result =
      parsed.data.entity_type === "user"
        ? await handleUserBulk(parsed.data, authResult.context.userId)
        : await handleClubBulk(parsed.data, authResult.context.userId)

    return NextResponse.json({ success: true, data: result, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[POST /api/admin/bulk]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al ejecutar la operación masiva" },
      { status: 500 }
    )
  }
}
