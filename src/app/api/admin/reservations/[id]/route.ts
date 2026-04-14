import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { logAdminAction } from "@/lib/audit/log"
import { notifyUser } from "@/features/notifications/utils"
import type { ApiResponse } from "@/types"

const patchSchema = z.object({
  status: z.literal("cancelled"),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<{ id: string; status: string }>>> {
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
      { success: false, data: null, error: "ID de reserva requerido" },
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
      .from("reservations")
      .select("id, user_id, status, date, start_time, end_time, courts(name)")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) throw new Error(fetchError.message)
    if (!existing) {
      return NextResponse.json(
        { success: false, data: null, error: "Reserva no encontrada" },
        { status: 404 }
      )
    }

    if (existing.status === "cancelled") {
      return NextResponse.json(
        { success: false, data: null, error: "La reserva ya está cancelada" },
        { status: 409 }
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select("id, status")
      .single()

    if (updateError) throw new Error(updateError.message)

    await logAdminAction({
      action: "reservation.cancelled",
      entityType: "reservations",
      entityId: id,
      actorId: authResult.context.userId,
      details: { id, previous_status: existing.status },
    })

    // Notify the reservation owner — fire-and-forget
    const court = Array.isArray(existing.courts) ? existing.courts[0] : existing.courts
    const courtName = (court as { name?: string } | null)?.name ?? "la cancha"
    void notifyUser(
      existing.user_id as string,
      {
        type:  "reservation.cancelled",
        title: "Reserva cancelada",
        body:  `Tu reserva en ${courtName} el ${existing.date as string} de ${(existing.start_time as string).slice(0, 5)} a ${(existing.end_time as string).slice(0, 5)} fue cancelada por el administrador.`,
        metadata: {
          reservation_id: id,
          date:           existing.date,
          start_time:     existing.start_time,
          end_time:       existing.end_time,
        },
      },
      "notify_user_on_cancelled",
    )

    return NextResponse.json({ success: true, data: updated, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[PATCH /api/admin/reservations/[id]]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al cancelar la reserva" },
      { status: 500 }
    )
  }
}
