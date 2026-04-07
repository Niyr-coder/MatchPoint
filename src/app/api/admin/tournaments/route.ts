import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { getAllTournamentsAdmin } from "@/lib/admin/queries"
import { createServiceClient } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"
import type { TournamentAdmin } from "@/lib/admin/queries"

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
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  try {
    const tournaments = await getAllTournamentsAdmin()
    return NextResponse.json({ success: true, data: tournaments, error: null })
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener los torneos" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<TournamentCreated>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Cuerpo de solicitud inválido" },
      { status: 400 }
    )
  }

  const parsed = createTournamentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  const { name, sport, clubId, maxParticipants, entryFee, startDate, endDate, modality, description } =
    parsed.data

  try {
    const supabase = await createServiceClient()

    // Verify the target club exists before inserting
    const { data: club, error: clubError } = await supabase
      .from("clubs")
      .select("id")
      .eq("id", clubId)
      .maybeSingle()

    if (clubError) throw new Error(clubError.message)
    if (!club) {
      return NextResponse.json(
        { success: false, data: null, error: "Club no encontrado" },
        { status: 404 }
      )
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
    return NextResponse.json(
      { success: true, data: tournament as TournamentCreated, error: null },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[POST /api/admin/tournaments]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al crear el torneo" },
      { status: 500 }
    )
  }
}
