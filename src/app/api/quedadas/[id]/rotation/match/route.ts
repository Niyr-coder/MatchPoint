import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { determineWinner, formatScore } from "@/features/organizer/utils/rotation"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { ok, fail } from "@/lib/api/response"

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
    return fail("Unauthorized", 401)
  }

  const rl = await checkRateLimit("quedadasMatch", user.id, RATE_LIMITS.quedadasMatch)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta más tarde.", 429)
  }

  const { data: quedada } = await supabase
    .from("tournaments")
    .select("created_by, event_type")
    .eq("id", quedadaId)
    .single()

  if (!quedada || quedada.event_type !== "quedada" || quedada.created_by !== user.id) {
    return fail("Forbidden", 403)
  }

  let raw: unknown
  try { raw = await request.json() } catch { raw = {} }

  const parsed = rotationMatchSchema.safeParse(raw)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
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
    return fail("Error al registrar resultado", 500)
  }

  return ok({ matchId: data.id, winnerId, loserId }, 201)
}
