import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const RATING_WIN_DELTA = 0.25
const RATING_LOSS_DELTA = -0.15

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
    .select("created_by, is_official, sport, name, club_id")
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
    .select("id, round, match_number, player1_id, player2_id, status")
    .eq("id", matchId)
    .eq("tournament_id", id)
    .single()

  if (!match) return NextResponse.json({ success: false, error: "Partido no encontrado" }, { status: 404 })

  // A7: Prevent overwriting a completed match
  if (match.status === "completed") {
    return NextResponse.json(
      { success: false, error: "Este partido ya tiene resultado registrado" },
      { status: 409 }
    )
  }

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
  await service.from("tournaments").update({ bracket_locked: true }).eq("id", id)

  // A3: Write match_results + update profiles.rating
  // A4: Upsert rankings
  const loserId = body.winner_id === match.player1_id ? match.player2_id : match.player1_id
  if (loserId) {
    const isOfficial = tournament.is_official ?? false

    // Insert match_results for both players
    await service.from("match_results").insert([
      {
        player_id: body.winner_id,
        opponent_id: loserId,
        event_id: id,
        event_type: "tournament",
        event_name: tournament.name,
        club_id: tournament.club_id ?? null,
        sport: tournament.sport,
        result: "win",
        score: body.score ?? null,
        is_official: isOfficial,
        rating_delta: isOfficial ? RATING_WIN_DELTA : 0,
      },
      {
        player_id: loserId,
        opponent_id: body.winner_id,
        event_id: id,
        event_type: "tournament",
        event_name: tournament.name,
        club_id: tournament.club_id ?? null,
        sport: tournament.sport,
        result: "loss",
        score: body.score ?? null,
        is_official: isOfficial,
        rating_delta: isOfficial ? RATING_LOSS_DELTA : 0,
      },
    ])

    // Fetch profiles to compute new values
    const [{ data: winnerProfile }, { data: loserProfile }] = await Promise.all([
      service.from("profiles").select("rating, matches_played, matches_won").eq("id", body.winner_id).single(),
      service.from("profiles").select("rating, matches_played, matches_won").eq("id", loserId).single(),
    ])

    // Update profiles stats (and rating if official)
    await Promise.all([
      winnerProfile && service.from("profiles").update({
        matches_played: (winnerProfile.matches_played ?? 0) + 1,
        matches_won: (winnerProfile.matches_won ?? 0) + 1,
        ...(isOfficial && {
          rating: Math.min(9.99, Math.max(0, Number(winnerProfile.rating ?? 0) + RATING_WIN_DELTA)),
        }),
      }).eq("id", body.winner_id),
      loserProfile && service.from("profiles").update({
        matches_played: (loserProfile.matches_played ?? 0) + 1,
        ...(isOfficial && {
          rating: Math.min(9.99, Math.max(0, Number(loserProfile.rating ?? 0) + RATING_LOSS_DELTA)),
        }),
      }).eq("id", loserId),
    ])

    // Upsert rankings for both players (A4)
    const [{ data: winnerRanking }, { data: loserRanking }] = await Promise.all([
      service.from("rankings").select("wins, losses, score").eq("user_id", body.winner_id).eq("sport", tournament.sport).maybeSingle(),
      service.from("rankings").select("wins, losses, score").eq("user_id", loserId).eq("sport", tournament.sport).maybeSingle(),
    ])

    await Promise.all([
      service.from("rankings").upsert({
        user_id: body.winner_id,
        sport: tournament.sport,
        wins: (winnerRanking?.wins ?? 0) + 1,
        losses: winnerRanking?.losses ?? 0,
        score: (winnerRanking?.score ?? 0) + 3,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,sport" }),
      service.from("rankings").upsert({
        user_id: loserId,
        sport: tournament.sport,
        wins: loserRanking?.wins ?? 0,
        losses: (loserRanking?.losses ?? 0) + 1,
        score: Math.max(0, (loserRanking?.score ?? 0) - 1),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,sport" }),
    ])
  }

  // Auto-advance winner to next elimination round
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
