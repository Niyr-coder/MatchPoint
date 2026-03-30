import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const service = await createServiceClient()
  const { data, error } = await service
    .from("tournament_participants")
    .select(`
      id,
      user_id,
      status,
      payment_status,
      seed,
      notes,
      registered_at,
      profiles:user_id (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq("tournament_id", id)
    .order("seed", { ascending: true, nullsFirst: false })
    .order("registered_at", { ascending: true })

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data ?? [] })
}
