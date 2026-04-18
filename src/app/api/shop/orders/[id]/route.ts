import { NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { broadcastNotificationToAll } from "@/features/notifications/utils"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { ok, fail } from "@/lib/api/response"

const updateStatusSchema = z.object({
  status: z.enum(["confirmed", "delivered", "cancelled"]),
})

type OrderStatus = "pending" | "pending_proof" | "confirmed" | "delivered" | "cancelled"

function canTransition(from: OrderStatus, to: string, role: string): boolean {
  if (role === "admin") return true
  if (role === "owner" || role === "manager") {
    if (from === "pending_proof" && (to === "confirmed" || to === "cancelled")) return true
    if (from === "confirmed" && to === "delivered") return true
    if (from === "pending" && to === "cancelled") return true
  }
  return false
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await authorize()
  if (!auth.ok) {
    return fail("No autorizado", 401)
  }

  const { userId, globalRole } = auth.context
  const rl = await checkRateLimit("shopOrderUpdate", userId, RATE_LIMITS.shopOrderUpdate)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta más tarde.", 429)
  }

  const body = await request.json()
  const parsed = updateStatusSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }

  const { status: newStatus } = parsed.data
  const supabase = createServiceClient()

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, status, user_id, club_id")
    .eq("id", id)
    .single()

  if (fetchError || !order) {
    return fail("Orden no encontrada", 404)
  }

  let effectiveRole = globalRole
  if (globalRole !== "admin" && order.club_id) {
    const { data: membership } = await supabase
      .from("club_members")
      .select("role")
      .eq("club_id", order.club_id)
      .eq("user_id", userId)
      .eq("is_active", true)
      .single()

    if (!membership) {
      return fail("Sin permisos para esta orden", 403)
    }
    effectiveRole = membership.role
  }

  if (!canTransition(order.status as OrderStatus, newStatus, effectiveRole)) {
    return fail(`No se puede cambiar de '${order.status}' a '${newStatus}'`, 422)
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", id)

  if (updateError) {
    console.error("[orders/[id]] Error updating order status:", updateError)
    return fail("Error al actualizar", 500)
  }

  const notificationMap: Record<string, { title: string; body: string; type: string }> = {
    confirmed: {
      type: "order_confirmed",
      title: "Pedido confirmado",
      body: "Tu pago fue recibido y tu pedido está confirmado.",
    },
    cancelled: {
      type: "order_cancelled",
      title: "Pedido cancelado",
      body: "Tu pedido fue cancelado. Contacta al club si tienes dudas.",
    },
    delivered: {
      type: "order_delivered",
      title: "Pedido entregado",
      body: "Tu pedido ha sido marcado como entregado.",
    },
  }

  const notification = notificationMap[newStatus]
  if (notification) {
    await broadcastNotificationToAll({
      type: notification.type,
      title: notification.title,
      body: notification.body,
      metadata: { order_id: id },
    })
  }

  return ok(null)
}
