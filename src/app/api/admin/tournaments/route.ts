import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { getAllTournamentsAdmin } from "@/lib/admin/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import type { ApiResponse } from "@/types"
import type { TournamentAdmin } from "@/lib/admin/queries"
import { ok, fail } from "@/lib/api/response"

interface TournamentCreated {
  id: string
  name: string
  sport: string
  status: string
  club_id: string | null
  max_participants: number | null
  entry_fee: number
  start_date: string
  end_date: string | null
  modality: string | null
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
}

const createTournamentSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres").max(100),
  sport: z.enum(["futbol", "padel", "tenis", "pickleball"], {
    message: "Deporte inválido. Use: futbol, padel, tenis, pickleball",
  }),
  clubId: z.string().uuid("ID de club inválido"),
  maxParticipants: z.number().int().min(2, "Mínimo 2 participantes").max(256),
  entryFee: z.number().min(0, "El costo no puede ser negativo").default(0),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate debe tener formato YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  modality: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
})

export async function GET(
  _request: NextRequest
): Promise<NextResponse<ApiResponse<TournamentAdmin[]>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  try {
    const tournaments = await getAllTournamentsAdmin()
    return ok(tournaments)
  } catch {
    return fail("Error al obtener los torneos", 500)
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<TournamentCreated>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  const ctx = authResult.context
  const rl = await checkRateLimit("tournamentCreate", ctx.userId, RATE_LIMITS.tournamentCreate)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta más tarde.", 429)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Cuerpo de solicitud inválido")
  }

  const parsed = createTournamentSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  const { name, sport, clubId, maxParticipants, entryFee, startDate, endDate, modality, description } =
    parsed.data

  try {
    const supabase = createServiceClient()

    // Verify the target club exists before inserting
    const { data: club, error: clubError } = await supabase
      .from("clubs")
      .select("id")
      .eq("id", clubId)
      .maybeSingle()

    if (clubError) throw new Error(clubError.message)
    if (!club) {
      return fail("Club no encontrado", 404)
    }

    const now = new Date().toISOString()

    const { data: tournament, error: insertError } = await supabase
      .from("tournaments")
      .insert({
        name: name.trim(),
        sport,
        club_id: clubId,
        max_participants: maxParticipants,
        entry_fee: entryFee,
        start_date: startDate,
        end_date: endDate ?? null,
        modality: modality ?? null,
        description: description ?? null,
        status: "draft",
        created_by: authResult.context.userId,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (insertError) throw new Error(insertError.message)
    return ok(tournament as TournamentCreated, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[POST /api/admin/tournaments]", message)
    return fail("Error al crear el torneo", 500)
  }
}
