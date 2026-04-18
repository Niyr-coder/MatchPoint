import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { logAdminAction } from "@/lib/audit/log"
import { notifyUser } from "@/features/notifications/utils"
import type { ApiResponse } from "@/types"
import { ok, fail } from "@/lib/api/response"

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
    return fail("No autorizado", 403)
  }

  const { id } = await context.params
  if (!id) {
    return fail("ID de reserva requerido")
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
      .from("reservations")
      .select("id, user_id, status, date, start_time, end_time, courts(name)")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) throw new Error(fetchError.message)
    if (!existing) {
      return fail("Reserva no encontrada", 404)
    }

    if (existing.status === "cancelled") {
      return fail("La reserva ya está cancelada", 409)
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

    return ok(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[PATCH /api/admin/reservations/[id]]", message)
    return fail("Error al cancelar la reserva", 500)
  }
}
