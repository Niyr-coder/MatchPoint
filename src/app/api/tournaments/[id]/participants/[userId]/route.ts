import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  // Only creator can update participants
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("created_by")
    .eq("id", id)
    .single()

  if (!tournament || tournament.created_by !== user.id) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json() as Record<string, unknown>
  const allowed: Record<string, unknown> = {}
  if (body.payment_status !== undefined) allowed.payment_status = body.payment_status
  if (body.status !== undefined) allowed.status = body.status
  if (body.notes !== undefined) allowed.notes = body.notes
  if (body.seed !== undefined) allowed.seed = body.seed

  const service = await createServiceClient()
  const { data, error } = await service
    .from("tournament_participants")
    .update(allowed)
    .eq("tournament_id", id)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("created_by")
    .eq("id", id)
    .single()

  if (!tournament || tournament.created_by !== user.id) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const service = await createServiceClient()
  const { error } = await service
    .from("tournament_participants")
    .delete()
    .eq("tournament_id", id)
    .eq("user_id", userId)

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
