import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { determineWinner, formatScore } from "@/features/organizer/utils/rotation"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"

const rotationMatchSchema = z.object({
  player1Id: z.string().uuid(),
  player2Id: z.string().uuid(),
  scoreA: z.number().int().min(0),
  scoreB: z.number().int().min(0),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: quedadaId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 })
  }

  const { data: quedada } = await supabase
    .from("tournaments")
    .select("created_by, event_type")
    .eq("id", quedadaId)
    .single()

  if (!quedada || quedada.event_type !== "quedada" || quedada.created_by !== user.id) {
    return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 })
  }

  const rl = await checkRateLimit("quedadasMatch", user.id, RATE_LIMITS.quedadasMatch)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }

  let raw: unknown
  try { raw = await request.json() } catch { raw = {} }

  const parsed = rotationMatchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { player1Id, player2Id, scoreA, scoreB } = parsed.data
  const winner = determineWinner(scoreA, scoreB)
  const winnerId = winner === "A" ? player1Id : player2Id
  const loserId = winner === "A" ? player2Id : player1Id

  const service = createServiceClient()

  const { data: maxRow } = await service
    .from("tournament_brackets")
    .select("match_number")
    .eq("tournament_id", quedadaId)
    .eq("round", 0)
    .order("match_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  const matchNumber = (maxRow?.match_number ?? 0) + 1

  const { data, error } = await service
    .from("tournament_brackets")
    .insert({
      tournament_id: quedadaId,
      round: 0,
      match_number: matchNumber,
      player1_id: player1Id,
      player2_id: player2Id,
      winner_id: winnerId,
      score: formatScore(scoreA, scoreB),
      status: "completed",
    })
    .select("id, winner_id")
    .single()

  if (error) {
    console.error("[POST /api/quedadas/[id]/rotation/match]", error.message)
    return NextResponse.json({ success: false, data: null, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: { matchId: data.id, winnerId, loserId },
    error: null,
  }, { status: 201 })
}
