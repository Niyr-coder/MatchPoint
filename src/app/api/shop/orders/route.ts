import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit"

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
  if (!user) return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ success: false, data: null, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data ?? [], error: null })
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rl = await checkRateLimit("shopOrders", ip, RATE_LIMITS.shopOrders)
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: "Demasiadas solicitudes. Intenta de nuevo en un momento." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfterSeconds),
          "X-RateLimit-Limit": String(RATE_LIMITS.shopOrders.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)),
        },
      }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = createOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 })
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
    return NextResponse.json({ error: "Error al verificar productos" }, { status: 500 })
  }

  if (!products || products.length !== productIds.length) {
    return NextResponse.json({ error: "Uno o más productos no están disponibles" }, { status: 400 })
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
      return NextResponse.json({ data: null, error: "Stock insuficiente para uno o más productos" }, { status: 409 })
    }
    return NextResponse.json({ data: null, error: "No se pudo crear la orden" }, { status: 500 })
  }

  return NextResponse.json({ data: { orderId: (data as { order_id: string }).order_id }, error: null })
}
