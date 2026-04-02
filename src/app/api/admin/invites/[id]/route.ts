import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/lib/auth/authorization"
import { createServiceClient } from "@/lib/supabase/server"
import { logAdminAction } from "@/lib/audit/log"
import type { ApiResponse } from "@/types"

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
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json(
      { success: false, data: null, error: "ID de invite link requerido" },
      { status: 400 }
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
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 422 }
    )
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
      return NextResponse.json(
        { success: false, data: null, error: "Invite link no encontrado" },
        { status: 404 }
      )
    }

    if (!existing.is_active) {
      return NextResponse.json(
        { success: false, data: null, error: "El invite link ya está revocado" },
        { status: 409 }
      )
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

    return NextResponse.json({ success: true, data: updated, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[PATCH /api/admin/invites/[id]]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al revocar el invite link" },
      { status: 500 }
    )
  }
}
