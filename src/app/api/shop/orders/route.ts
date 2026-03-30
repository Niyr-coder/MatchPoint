import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data ?? [] })
}

export async function POST(request: Request) {
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

  const { items, clubId } = parsed.data

  // Fetch actual product prices + stock from DB to prevent manipulation
  const productIds = items.map((i) => i.product_id)
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, price, stock, is_active")
    .in("id", productIds)
    .eq("is_active", true)

  if (productsError) return NextResponse.json({ error: productsError.message }, { status: 500 })

  if (!products || products.length !== productIds.length) {
    return NextResponse.json({ error: "Uno o más productos no están disponibles" }, { status: 400 })
  }

  const priceMap = new Map(products.map((p) => [p.id, p]))

  // Validate stock for each item (-1 means unlimited)
  for (const item of items) {
    const product = priceMap.get(item.product_id)!
    if (product.stock !== -1 && item.quantity > product.stock) {
      return NextResponse.json(
        { error: `Stock insuficiente para "${product.name}": disponible ${product.stock}, solicitado ${item.quantity}` },
        { status: 409 }
      )
    }
  }

  const total = items.reduce((sum, item) => {
    const product = priceMap.get(item.product_id)!
    return sum + product.price * item.quantity
  }, 0)

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({ user_id: user.id, club_id: clubId ?? null, total, status: "pending" })
    .select()
    .single()

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

  const orderItems = items.map((item) => {
    const product = priceMap.get(item.product_id)!
    return {
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: product.price,
      product_name: product.name,
    }
  })

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems)
  if (itemsError) {
    void supabase.from("orders").delete().eq("id", order.id)
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  // Decrement stock for limited-stock items using service client
  const service = await createServiceClient()
  const stockDecrements = items
    .filter((item) => {
      const product = priceMap.get(item.product_id)!
      return product.stock !== -1
    })
    .map((item) => {
      const product = priceMap.get(item.product_id)!
      return service.from("products")
        .update({ stock: Math.max(0, product.stock - item.quantity) })
        .eq("id", item.product_id)
    })

  await Promise.all(stockDecrements)

  return NextResponse.json({ order })
}
