import { NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createClient } from "@/lib/supabase/server"
import { broadcastNotificationToAll } from "@/features/notifications/utils"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { ok, fail } from "@/lib/api/response"

const proofSchema = z.object({
  proof_url: z.string().url("Debe ser una URL válida")
    .refine(url => url.startsWith("https://"), { message: "Solo se permiten URLs HTTPS" }),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await authorize()
  if (!auth.ok) {
    return fail("No autorizado", 401)
  }

  const { userId } = auth.context
  const rl = await checkRateLimit("proofUpload", userId, RATE_LIMITS.proofUpload)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta más tarde.", 429)
  }

  const body = await request.json()
  const parsed = proofSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }

  const supabase = await createClient()

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, status, user_id, club_id")
    .eq("id", id)
    .eq("user_id", userId)
    .single()

  if (fetchError || !order) {
    return fail("Orden no encontrada", 404)
  }

  if (order.status !== "pending") {
    return fail("Solo puedes subir comprobante en órdenes pendientes", 422)
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ proof_url: parsed.data.proof_url, status: "pending_proof" })
    .eq("id", id)

  if (updateError) {
    console.error("[orders/[id]/proof] Error updating proof:", updateError)
    return fail("Error al guardar comprobante", 500)
  }

  if (order.club_id) {
    await broadcastNotificationToAll({
      type: "order_proof_submitted",
      title: "Comprobante recibido",
      body: "Un cliente subió su comprobante de pago. Revisa y confirma la orden.",
      metadata: { order_id: id, club_id: order.club_id },
    })
  }

  return ok(null)
}
