import { NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { broadcastNotificationToAll } from "@/features/notifications/utils"

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
    return NextResponse.json(
      { data: null, error: "No autorizado" },
      { status: 401 }
    )
  }

  const body = await request.json()
  const parsed = updateStatusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { status: newStatus } = parsed.data
  const { userId, globalRole } = auth.context
  const supabase = createServiceClient()

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, status, user_id, club_id")
    .eq("id", id)
    .single()

  if (fetchError || !order) {
    return NextResponse.json(
      { data: null, error: "Orden no encontrada" },
      { status: 404 }
    )
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
      return NextResponse.json(
        { data: null, error: "Sin permisos para esta orden" },
        { status: 403 }
      )
    }
    effectiveRole = membership.role
  }

  if (!canTransition(order.status as OrderStatus, newStatus, effectiveRole)) {
    return NextResponse.json(
      { data: null, error: `No se puede cambiar de '${order.status}' a '${newStatus}'` },
      { status: 422 }
    )
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", id)

  if (updateError) {
    console.error("[orders/[id]] Error updating order status:", updateError)
    return NextResponse.json(
      { data: null, error: "Error al actualizar" },
      { status: 500 }
    )
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

  return NextResponse.json({ data: null, error: null })
}
