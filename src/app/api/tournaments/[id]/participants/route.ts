import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { z } from "zod"

const addParticipantSchema = z.object({
  userId: z.string().uuid("userId debe ser un UUID válido"),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const service = createServiceClient()
  const { data, error } = await service
    .from("tournament_participants")
    .select(`
      id,
      user_id,
      status,
      payment_status,
      seed,
      notes,
      withdrawal_reason,
      registered_at,
      profiles!tp_user_profile_fk (
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("created_by, status")
    .eq("id", id)
    .single()

  if (!tournament || tournament.created_by !== user.id) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  if (["completed", "cancelled"].includes(tournament.status)) {
    return NextResponse.json(
      { success: false, error: "No se pueden agregar participantes a un torneo finalizado o cancelado" },
      { status: 400 }
    )
  }

  let rawBody: unknown
  try { rawBody = await request.json() } catch { rawBody = {} }
  const parsed = addParticipantSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
  }
  const body = parsed.data

  const service = createServiceClient()

  // Check if already participating (including withdrawn)
  const { data: existing } = await service
    .from("tournament_participants")
    .select("id, status")
    .eq("tournament_id", id)
    .eq("user_id", body.userId)
    .maybeSingle()

  if (existing) {
    if (existing.status === "withdrawn") {
      // Re-register a previously withdrawn participant
      const { data, error } = await service
        .from("tournament_participants")
        .update({ status: "registered", withdrawal_reason: null })
        .eq("id", existing.id)
        .select()
        .single()
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data, reregistered: true })
    }
    return NextResponse.json({ success: false, error: "El participante ya está inscrito" }, { status: 409 })
  }

  const { data, error } = await service
    .from("tournament_participants")
    .insert({ tournament_id: id, user_id: body.userId })
    .select()
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  // For in_progress: try to fill the first available bye slot in round 1
  let bracketSlotFilled = false
  if (tournament.status === "in_progress") {
    const { data: byeMatch } = await service
      .from("tournament_brackets")
      .select("id, player1_id, player2_id")
      .eq("tournament_id", id)
      .eq("status", "bye")
      .order("round", { ascending: true })
      .order("match_number", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (byeMatch) {
      const slot = byeMatch.player1_id === null ? "player1_id" : "player2_id"
      const newStatus = byeMatch.player1_id !== null || byeMatch.player2_id !== null ? "pending" : "bye"
      await service
        .from("tournament_brackets")
        .update({ [slot]: body.userId, status: newStatus })
        .eq("id", byeMatch.id)
      bracketSlotFilled = true
    }
  }

  return NextResponse.json({ success: true, data, bracketSlotFilled }, { status: 201 })
}
