import { NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/lib/auth/authorization"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const patchBodySchema = z.object({
  winner_id: z.string().uuid(),
  loser_id: z.string().uuid(),
  winner_score: z.number().int().min(0),
  loser_score: z.number().int().min(0),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const { id: tournamentId, matchId } = await params

  // Parse and validate body first — fail fast before any DB round-trips
  let body: z.infer<typeof patchBodySchema>
  try {
    body = patchBodySchema.parse(await request.json())
  } catch (err) {
    const message = err instanceof z.ZodError
      ? err.errors.map((e) => e.message).join(", ")
      : "Invalid request body"
    return NextResponse.json({ data: null, error: message }, { status: 400 })
  }

  // Fetch tournament to get club_id, sport, is_official for auth + RPC
  const supabase = await createClient()
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("club_id, sport, is_official, created_by")
    .eq("id", tournamentId)
    .single()

  if (tournamentError || !tournament) {
    return NextResponse.json({ data: null, error: "Tournament not found" }, { status: 404 })
  }

  // Authorization: full 6-layer check via authorize()
  // club_id may be null for tournaments not scoped to a club — fall back to
  // creator check in that case (layer 3 admin bypass still applies).
  const authResult = await authorize({
    clubId: tournament.club_id ?? null,
    requiredPermission: "tournaments.manage",
  })

  if (!authResult.ok) {
    // If the user failed club-level permission, allow the tournament creator as fallback
    const supabaseClient = await createClient()
    const { data: { user } } = await supabaseClient.auth.getUser()
    const isCreator = user && tournament.created_by === user.id

    if (!isCreator) {
      return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
    }
  }

  // Call the atomic RPC — all writes happen inside a single DB transaction
  const service = await createServiceClient()
  const { data: rpcData, error: rpcError } = await service.rpc("score_bracket_match", {
    p_match_id: matchId,
    p_tournament_id: tournamentId,
    p_winner_id: body.winner_id,
    p_loser_id: body.loser_id,
    p_winner_score: body.winner_score,
    p_loser_score: body.loser_score,
    p_sport: tournament.sport,
    p_is_official: tournament.is_official ?? false,
  })

  if (rpcError) {
    const msg = rpcError.message ?? ""

    // SQLSTATE P0002 (no_data_found) — match not found in tournament
    if (error.code === "P0002" || msg.includes("not found in tournament")) {
      return NextResponse.json({ data: null, error: "Partido no encontrado" }, { status: 404 })
    }

    // SQLSTATE 23505 (unique_violation) re-used for already-scored match
    if (error.code === "23505" || msg.includes("ya tiene resultado")) {
      return NextResponse.json(
        { data: null, error: "Este partido ya tiene resultado registrado" },
        { status: 409 }
      )
    }

    console.error("[PATCH /api/tournaments/[id]/brackets/[matchId]] RPC error", {
      matchId,
      tournamentId,
      error: msg,
    })
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      nextMatchId: rpcData?.next_match_id ?? null,
      winnerNewRating: rpcData?.winner_new_rating ?? null,
      loserNewRating: rpcData?.loser_new_rating ?? null,
    },
    error: null,
  })
}
