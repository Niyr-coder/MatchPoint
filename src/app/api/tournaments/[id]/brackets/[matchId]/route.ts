import { NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { ok, fail, rateLimited } from "@/lib/api/response"
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit"

// ── Schema: normal score entry ────────────────────────────────────────────────

const scoreSchema = z.object({
  correction: z.literal(false).optional(),
  winner_id:    z.string().uuid(),
  loser_id:     z.string().uuid(),
  winner_score: z.number().int().min(0),
  loser_score:  z.number().int().min(0),
})

// ── Schema: score correction ──────────────────────────────────────────────────

const correctionSchema = z.object({
  correction:     z.literal(true),
  new_score:      z.string().min(1, "new_score es requerido"),
  new_winner_id:  z.string().uuid("new_winner_id debe ser un UUID válido"),
  reason:         z.string().min(1, "reason es requerido").max(500),
})

// ── Shared auth helper ────────────────────────────────────────────────────────

async function authorizeForTournament(
  tournamentId: string,
  clubId: string | null
): Promise<{ userId: string } | NextResponse> {
  const authResult = await authorize({
    clubId,
    requiredPermission: "tournaments.manage",
  })

  if (authResult.ok) {
    return { userId: authResult.context.userId }
  }

  // Fall back: allow the tournament creator even without club-level permission
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    )
  }

  // Fetch created_by separately when caller does not yet have tournament data
  const service = createServiceClient()
  const { data: row } = await service
    .from("tournaments")
    .select("created_by")
    .eq("id", tournamentId)
    .single()

  if (!row || row.created_by !== user.id) {
    return NextResponse.json(
      { success: false, data: null, error: "Forbidden" },
      { status: 403 }
    )
  }

  return { userId: user.id }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const { id: tournamentId, matchId } = await params

  // Parse raw body once — branch on `correction` flag
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return fail("JSON inválido")
  }

  const isCorrection =
    typeof rawBody === "object" &&
    rawBody !== null &&
    (rawBody as Record<string, unknown>).correction === true

  if (isCorrection) {
    return handleCorrection(request, tournamentId, matchId, rawBody)
  }

  return handleScoreEntry(tournamentId, matchId, rawBody)
}

// ── Normal score entry ────────────────────────────────────────────────────────

async function handleScoreEntry(
  tournamentId: string,
  matchId: string,
  rawBody: unknown
): Promise<NextResponse> {
  let body: z.infer<typeof scoreSchema>
  try {
    body = scoreSchema.parse(rawBody)
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? err.issues.map((e) => e.message).join(", ")
        : "Invalid request body"
    return NextResponse.json(
      { success: false, data: null, error: message },
      { status: 400 }
    )
  }

  // Fetch tournament for auth + RPC params
  const supabase = await createClient()
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("club_id, sport, is_official, created_by")
    .eq("id", tournamentId)
    .single()

  if (tournamentError || !tournament) {
    return NextResponse.json(
      { success: false, data: null, error: "Tournament not found" },
      { status: 404 }
    )
  }

  // Auth: club permission OR creator fallback
  const authResult = await authorize({
    clubId: tournament.club_id ?? null,
    requiredPermission: "tournaments.manage",
  })

  if (!authResult.ok) {
    const supabaseClient = await createClient()
    const { data: { user } } = await supabaseClient.auth.getUser()
    const isCreator = user && tournament.created_by === user.id

    if (!isCreator) {
      return NextResponse.json(
        { success: false, data: null, error: "Forbidden" },
        { status: 403 }
      )
    }
  }

  // Call the atomic RPC
  const service = createServiceClient()
  const { data: rpcData, error: rpcError } = await service.rpc(
    "score_bracket_match",
    {
      p_match_id:      matchId,
      p_tournament_id: tournamentId,
      p_winner_id:     body.winner_id,
      p_loser_id:      body.loser_id,
      p_winner_score:  body.winner_score,
      p_loser_score:   body.loser_score,
      p_sport:         tournament.sport,
      p_is_official:   tournament.is_official ?? false,
    }
  )

  if (rpcError) {
    const msg = rpcError.message ?? ""

    if (rpcError.code === "P0002" || msg.includes("not found in tournament")) {
      return NextResponse.json(
        { success: false, data: null, error: "Partido no encontrado" },
        { status: 404 }
      )
    }

    if (rpcError.code === "23505" || msg.includes("ya tiene resultado")) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Este partido ya tiene resultado registrado",
        },
        { status: 409 }
      )
    }

    console.error(
      "[PATCH /api/tournaments/[id]/brackets/[matchId]] RPC error",
      { matchId, tournamentId, error: msg }
    )
    return NextResponse.json(
      { success: false, data: null, error: "Internal server error" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      nextMatchId:       rpcData?.next_match_id ?? null,
      winnerNewRating:   rpcData?.winner_new_rating ?? null,
      loserNewRating:    rpcData?.loser_new_rating ?? null,
    },
    error: null,
  })
}

// ── Score correction ──────────────────────────────────────────────────────────

async function handleCorrection(
  request: Request,
  tournamentId: string,
  matchId: string,
  rawBody: unknown
): Promise<NextResponse> {
  // Rate limit — checked before any DB work
  const ip = getClientIp(request)
  const rl = await checkRateLimit(
    "bracketScoreCorrect",
    ip,
    RATE_LIMITS.bracketScoreCorrect
  )
  if (!rl.allowed) {
    return rateLimited(rl.retryAfterSeconds, rl.resetAt, RATE_LIMITS.bracketScoreCorrect.limit)
  }

  // Validate body
  let body: z.infer<typeof correctionSchema>
  try {
    body = correctionSchema.parse(rawBody)
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? err.issues.map((e) => e.message).join(", ")
        : "Invalid request body"
    return fail(message)
  }

  // Fetch tournament for auth
  const supabase = await createClient()
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("club_id, created_by")
    .eq("id", tournamentId)
    .single()

  if (tournamentError || !tournament) {
    return fail("Tournament not found", 404)
  }

  // Auth: tournament creator OR MANAGER/OWNER in the club
  const authResult = await authorize({
    clubId: tournament.club_id ?? null,
    requiredRoles: ["manager", "owner", "admin"],
  })

  if (!authResult.ok) {
    // Fall back: tournament creator is also allowed
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || tournament.created_by !== user.id) {
      return fail("Forbidden", 403)
    }
  }

  // Determine acting user id
  const actorId = authResult.ok
    ? authResult.context.userId
    : (await supabase.auth.getUser()).data.user!.id

  // Call RPC for atomic correction
  const service = createServiceClient()
  const { data: rpcData, error: rpcError } = await service.rpc(
    "correct_bracket_match_score",
    {
      p_match_id:      matchId,
      p_new_score:     body.new_score,
      p_new_winner_id: body.new_winner_id,
      p_reason:        body.reason,
      p_user_id:       actorId,
    }
  )

  if (rpcError) {
    const msg = rpcError.message ?? ""

    if (rpcError.code === "P0002" || msg.includes("not found")) {
      return fail("Partido no encontrado", 404)
    }

    console.error(
      "[PATCH correction /api/tournaments/[id]/brackets/[matchId]] RPC error",
      { matchId, tournamentId, error: msg }
    )
    return fail("Internal server error", 500)
  }

  return ok({
    correction_id:  rpcData?.correction_id ?? null,
    winner_changed: rpcData?.winner_changed ?? false,
  })
}
