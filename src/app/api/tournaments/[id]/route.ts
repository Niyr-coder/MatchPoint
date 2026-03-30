import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("tournaments")
    .select("*, clubs(name)")
    .eq("id", id)
    .single()

  if (error) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  return NextResponse.json({ success: true, data })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { status } = body as { status: string }

  const allowed = ["open", "in_progress", "completed", "cancelled"]
  if (!allowed.includes(status)) {
    return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("tournaments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("created_by", user.id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ success: false, error: "Not found or unauthorized" }, { status: 404 })
  }
  return NextResponse.json({ success: true, data })
}
