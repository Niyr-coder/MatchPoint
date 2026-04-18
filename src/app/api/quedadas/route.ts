import { NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { canOrganize } from "@/features/organizer/permissions"
import { getOrganizerQuedadas } from "@/features/organizer/queries"
import { createTournament } from "@/features/tournaments/queries"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { z } from "zod"
import { ok, fail } from "@/lib/api/response"

const createQuedadaSchema = z.object({
  name: z.string().min(3).max(100),
  game_dynamic: z.enum(["standard", "king_of_court", "popcorn", "round_robin"]),
  modality: z.string().min(1).max(50),
  max_participants: z.number().int().min(4).max(64),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  club_id: z.string().uuid().optional(),
  is_public: z.boolean().optional(),
  court_count: z.number().int().min(1).max(6).optional().default(1),
})

export async function GET() {
  const authResult = await authorize()
  if (!authResult.ok) {
    return fail("Unauthorized", 401)
  }

  const ctx = authResult.context
  const allowed = await canOrganize(ctx)
  if (!allowed) {
    return fail("Forbidden", 403)
  }

  try {
    const quedadas = await getOrganizerQuedadas(ctx.userId)
    return ok(quedadas)
  } catch (error: unknown) {
    console.error("[api/quedadas GET]", error)
    return fail("Error al obtener quedadas", 500)
  }
}

export async function POST(request: Request) {
  const authResult = await authorize()
  if (!authResult.ok) {
    return fail("Unauthorized", 401)
  }

  const ctx = authResult.context
  const allowed = await canOrganize(ctx)
  if (!allowed) {
    return fail("Forbidden", 403)
  }

  const rl = await checkRateLimit("quedadasCreate", ctx.userId, RATE_LIMITS.quedadasCreate)
  if (!rl.allowed) {
    return fail("Demasiadas quedadas creadas. Intenta más tarde.", 429)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Invalid JSON")
  }

  const parsed = createQuedadaSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  const d = parsed.data

  try {
    const quedada = await createTournament(ctx.userId, {
      name: d.name,
      sport: "pickleball",
      modality: d.modality,
      max_participants: d.max_participants,
      start_date: d.start_date,
      start_time: d.start_time,
      entry_fee: 0,
      club_id: d.club_id,
      event_type: "quedada",
      game_dynamic: d.game_dynamic,
      court_count: d.court_count,
    })
    return ok(quedada, 201)
  } catch (error: unknown) {
    console.error("[api/quedadas POST]", error)
    return fail("Error al crear quedada", 500)
  }
}
