import { NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createClient } from "@/lib/supabase/server"
import { broadcastNotificationToAll } from "@/features/notifications/utils"

const proofSchema = z.object({
  proof_url: z.string().url("Debe ser una URL válida"),
})

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
  const parsed = proofSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { userId } = auth.context
  const supabase = await createClient()

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, status, user_id, club_id")
    .eq("id", id)
    .eq("user_id", userId)
    .single()

  if (fetchError || !order) {
    return NextResponse.json(
      { data: null, error: "Orden no encontrada" },
      { status: 404 }
    )
  }

  if (order.status !== "pending") {
    return NextResponse.json(
      { data: null, error: "Solo puedes subir comprobante en órdenes pendientes" },
      { status: 422 }
    )
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ proof_url: parsed.data.proof_url, status: "pending_proof" })
    .eq("id", id)

  if (updateError) {
    console.error("[orders/[id]/proof] Error updating proof:", updateError)
    return NextResponse.json(
      { data: null, error: "Error al guardar comprobante" },
      { status: 500 }
    )
  }

  if (order.club_id) {
    await broadcastNotificationToAll({
      type: "order_proof_submitted",
      title: "Comprobante recibido",
      body: "Un cliente subió su comprobante de pago. Revisa y confirma la orden.",
      metadata: { order_id: id, club_id: order.club_id },
    })
  }

  return NextResponse.json({ data: null, error: null })
}
