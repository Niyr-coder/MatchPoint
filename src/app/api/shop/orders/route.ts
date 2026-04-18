import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit"
import { broadcastNotificationToAll } from "@/features/notifications/utils"
import { ok, fail } from "@/lib/api/response"

const orderItemSchema = z.object({
  product_id: z.string().uuid("product_id inválido"),
  quantity: z.number().int().min(1, "La cantidad debe ser al menos 1"),
})

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "Se requiere al menos un producto"),
  clubId: z.string().uuid().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail("Unauthorized", 401)

  const { data, error } = await supabase
    .from("orders")
    .select("id, total, status, proof_url, created_at, items:order_items(product_name, quantity, unit_price)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) return fail(error.message, 500)
  return ok(data ?? [])
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rl = await checkRateLimit("shopOrders", ip, RATE_LIMITS.shopOrders)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta de nuevo en un momento.", 429)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail("Unauthorized", 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("JSON inválido")
  }

  const parsed = createOrderSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  const { items } = parsed.data

  // Fetch authoritative product prices from DB — never trust client-supplied prices
  const productIds = items.map((i) => i.product_id)
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, price, is_active")
    .in("id", productIds)
    .eq("is_active", true)

  if (productsError) {
    return fail("Error al verificar productos", 500)
  }

  if (!products || products.length !== productIds.length) {
    return fail("Uno o más productos no están disponibles")
  }

  const serverPrices = Object.fromEntries(products.map((p) => [p.id, p.price as number]))

  const rpcItems = items.map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: serverPrices[item.product_id],
  }))

  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient.rpc("create_order_atomic", {
    p_user_id: user.id,
    p_items: rpcItems,
  })

  if (error) {
    // SQLSTATE 53000 (insufficient_resources) or message from create_order_atomic
    if (error.code === "53000" || error.message.includes("Stock insuficiente")) {
      return fail("Stock insuficiente para uno o más productos", 409)
    }
    return fail("No se pudo crear la orden", 500)
  }

  const rpcResult = data as { order_id: string }

  // Fire-and-forget notification to club staff
  broadcastNotificationToAll({
    type: "new_order",
    title: "Nuevo pedido recibido",
    body: "Un cliente ha realizado un pedido. Espera el comprobante de pago.",
    metadata: { order_id: rpcResult.order_id },
  }).catch(console.error)

  return ok({ orderId: rpcResult.order_id })
}
