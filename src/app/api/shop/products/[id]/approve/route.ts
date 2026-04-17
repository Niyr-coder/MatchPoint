import { NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { broadcastNotificationToAll } from "@/features/notifications/utils"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"

const approveSchema = z.object({
  action: z.enum(["approve", "reject"]),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await authorize({ requiredRoles: ["admin"] })
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "Solo administradores" },
      { status: 403 }
    )
  }

  const { userId } = auth.context
  const rl = await checkRateLimit("adminBulk", userId, RATE_LIMITS.adminBulk)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }

  const body = await request.json()
  const parsed = approveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "action debe ser approve o reject" },
      { status: 400 }
    )
  }

  const { action } = parsed.data
  const supabase = createServiceClient()

  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select("id, name, created_by, approval_status")
    .eq("id", id)
    .single()

  if (fetchError || !product) {
    return NextResponse.json(
      { success: false, data: null, error: "Producto no encontrado" },
      { status: 404 }
    )
  }

  const newApprovalStatus = action === "approve" ? "approved" : "rejected"
  const newIsActive = action === "approve"

  const { error: updateError } = await supabase
    .from("products")
    .update({ approval_status: newApprovalStatus, is_active: newIsActive })
    .eq("id", id)

  if (updateError) {
    console.error("[api/shop/products/approve] Error updating product approval:", updateError)
    return NextResponse.json(
      { success: false, data: null, error: "Error al procesar" },
      { status: 500 }
    )
  }

  if (product.created_by) {
    await broadcastNotificationToAll({
      type: action === "approve" ? "product_approved" : "product_rejected",
      title: action === "approve" ? "Producto aprobado" : "Producto rechazado",
      body:
        action === "approve"
          ? `Tu producto "${product.name}" fue aprobado y ya está disponible en la tienda.`
          : `Tu producto "${product.name}" fue rechazado. Contacta al administrador para más detalles.`,
      metadata: { product_id: id },
    })
  }

  return NextResponse.json({ success: true, data: null, error: null })
}
