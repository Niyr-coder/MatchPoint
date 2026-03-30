import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")
  const clubId = searchParams.get("clubId")

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let query = supabase.from("products").select("*").eq("is_active", true)
  if (category) query = query.eq("category", category)
  if (clubId) query = query.eq("club_id", clubId)

  const { data, error } = await query.order("created_at", { ascending: false })
  if (error) return NextResponse.json({ products: [] })
  return NextResponse.json({ products: data ?? [] })
}
