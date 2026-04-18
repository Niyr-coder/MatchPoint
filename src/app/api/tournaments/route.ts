import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getOpenTournaments, getCreatedTournaments, createTournament } from "@/features/tournaments/queries"
import { authorize } from "@/features/auth/queries"
import { z } from "zod"
import { SPORT_IDS } from "@/lib/sports/config"
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit"

const createTournamentSchema = z.object({
  name: z.string().min(3).max(100),
  sport: z.enum(SPORT_IDS),
  description: z.string().max(1000).optional(),
  max_participants: z.number().int().min(2).max(256).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  entry_fee: z.number().min(0),
  club_id: z.string().uuid().optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  modality: z.string().max(50).optional(),
  is_official: z.boolean().optional(),
  extras: z.object({
    sorteos: z.object({ enabled: z.boolean(), detail: z.string().optional() }).optional(),
    premios: z.object({ enabled: z.boolean(), detail: z.string().optional() }).optional(),
    streaming: z.object({ enabled: z.boolean() }).optional(),
    fotografia: z.object({ enabled: z.boolean() }).optional(),
    arbitro: z.object({ enabled: z.boolean() }).optional(),
    patrocinador: z.object({ enabled: z.boolean(), name: z.string().optional() }).optional(),
  }).optional(),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const createdBy = request.nextUrl.searchParams.get("created_by")

  try {
    const tournaments = createdBy
      ? await getCreatedTournaments(createdBy)
      : await getOpenTournaments()
    return NextResponse.json({ success: true, data: tournaments })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener torneos"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit("tournamentCreate", getClientIp(request), RATE_LIMITS.tournamentCreate)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createTournamentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  // Authorization:
  //   - No club_id → any authenticated user with a profile can create a personal tournament
  //   - club_id present → user must have tournaments.manage permission in that club
  //   - is_official → additionally restricted to owner/manager roles (club_id required for official)
  const authResult = await authorize(
    parsed.data.club_id
      ? {
          clubId: parsed.data.club_id,
          requiredPermission: "tournaments.manage",
          ...(parsed.data.is_official ? { requiredRoles: ["owner", "manager"] as const } : {}),
        }
      : {}
  )

  if (!authResult.ok) {
    const status = authResult.reason === "not_authenticated" ? 401 : 403
    const message = authResult.reason === "not_authenticated" ? "Unauthorized" : "Forbidden"
    return NextResponse.json({ success: false, error: message }, { status })
  }

  try {
    const tournament = await createTournament(authResult.context.userId, {
      name: parsed.data.name,
      sport: parsed.data.sport,
      description: parsed.data.description,
      max_participants: parsed.data.max_participants,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      entry_fee: parsed.data.entry_fee,
      club_id: parsed.data.club_id,
      start_time: parsed.data.start_time,
      modality: parsed.data.modality,
      is_official: parsed.data.is_official,
      extras: parsed.data.extras,
    })
    return NextResponse.json({ success: true, data: tournament }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al crear torneo"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
