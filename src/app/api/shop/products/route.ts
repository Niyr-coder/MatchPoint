import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

const getProductsSchema = z.object({
  category: z.enum(["equipment", "membership", "class", "other"]).optional(),
  clubId: z.string().uuid("clubId debe ser un UUID válido").optional(),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parsed = getProductsSchema.safeParse({
    category: searchParams.get("category") ?? undefined,
    clubId: searchParams.get("clubId") ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { category, clubId } = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let query = supabase.from("products").select("*").eq("is_active", true)
  if (category) query = query.eq("category", category)
  if (clubId) query = query.eq("club_id", clubId)

  const { data, error } = await query.order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products: data ?? [] })
}
