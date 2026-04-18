import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { logAdminAction } from "@/lib/audit/log"
import type { ApiResponse } from "@/types"
import { ok, fail } from "@/lib/api/response"

const patchSchema = z.object({
  is_active: z.literal(false),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<{ id: string; is_active: boolean }>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  const { id } = await context.params
  if (!id) {
    return fail("ID de invite link requerido")
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Cuerpo de solicitud inválido")
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Datos inválidos", 422)
  }

  try {
    const supabase = createServiceClient()

    const { data: existing, error: fetchError } = await supabase
      .from("invite_links")
      .select("id, is_active")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) throw new Error(fetchError.message)
    if (!existing) {
      return fail("Invite link no encontrado", 404)
    }

    if (!existing.is_active) {
      return fail("El invite link ya está revocado", 409)
    }

    const { data: updated, error: updateError } = await supabase
      .from("invite_links")
      .update({ is_active: false })
      .eq("id", id)
      .select("id, is_active")
      .single()

    if (updateError) throw new Error(updateError.message)

    await logAdminAction({
      action: "invite_link.revoked",
      entityType: "invite_links",
      entityId: id,
      actorId: authResult.context.userId,
      details: { id },
    })

    return ok(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[PATCH /api/admin/invites/[id]]", message)
    return fail("Error al revocar el invite link", 500)
  }
}
