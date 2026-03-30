import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const { id, matchId } = await params
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

  const body = await request.json() as { score?: string; winner_id: string }
  if (!body.winner_id) {
    return NextResponse.json({ success: false, error: "winner_id requerido" }, { status: 400 })
  }

  const service = await createServiceClient()

  const { data: match } = await service
    .from("tournament_brackets")
    .select("id, round, match_number, player1_id, player2_id")
    .eq("id", matchId)
    .eq("tournament_id", id)
    .single()

  if (!match) return NextResponse.json({ success: false, error: "Partido no encontrado" }, { status: 404 })

  if (body.winner_id !== match.player1_id && body.winner_id !== match.player2_id) {
    return NextResponse.json(
      { success: false, error: "El ganador debe ser uno de los participantes del partido" },
      { status: 400 }
    )
  }

  // Record result
  const { error: matchError } = await service
    .from("tournament_brackets")
    .update({ score: body.score ?? null, winner_id: body.winner_id, status: "completed" })
    .eq("id", matchId)

  if (matchError) return NextResponse.json({ success: false, error: matchError.message }, { status: 500 })

  // Lock the bracket on first recorded result
  await supabase
    .from("tournaments")
    .update({ bracket_locked: true })
    .eq("id", id)
    .eq("created_by", user.id)

  // Auto-advance winner to next elimination round
  // Next round match: Math.ceil(match_number / 2), slot: odd → player1, even → player2
  const nextRound = match.round + 1
  const nextMatchNumber = Math.ceil(match.match_number / 2)
  const slot = match.match_number % 2 === 1 ? "player1_id" : "player2_id"

  const { data: nextMatch } = await service
    .from("tournament_brackets")
    .select("id")
    .eq("tournament_id", id)
    .eq("round", nextRound)
    .eq("match_number", nextMatchNumber)
    .maybeSingle()

  if (nextMatch) {
    await service
      .from("tournament_brackets")
      .update({ [slot]: body.winner_id })
      .eq("id", nextMatch.id)
  }

  return NextResponse.json({ success: true, advanced: nextMatch !== null })
}
