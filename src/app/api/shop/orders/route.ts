import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

interface OrderItem {
  product_id: string
  quantity: number
  unit_price: number
  product_name: string
}

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

  if (error) return NextResponse.json({ orders: [] })
  return NextResponse.json({ orders: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json() as { items?: OrderItem[]; clubId?: string }
  const { items, clubId } = body

  if (!items?.length) {
    return NextResponse.json({ error: "No items" }, { status: 400 })
  }

  const total = items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  )

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({ user_id: user.id, club_id: clubId ?? null, total, status: "pending" })
    .select()
    .single()

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

  const orderItems = items.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    product_name: item.product_name,
  }))

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems)
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

  return NextResponse.json({ order })
}
