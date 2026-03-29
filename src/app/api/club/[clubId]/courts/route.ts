import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/lib/auth/authorization"
import { getClubCourts, createCourt } from "@/lib/courts/queries"
import type { ApiResponse } from "@/types"
import type { Court } from "@/lib/courts/queries"

const createCourtSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "Nombre demasiado largo"),
  sport: z.enum(["futbol", "padel", "tenis", "pickleball"], "Deporte inválido"),
  surface_type: z.string().max(100).optional(),
  is_indoor: z.boolean(),
  price_per_hour: z.number().min(0, "El precio debe ser positivo"),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
): Promise<NextResponse<ApiResponse<Court[]>>> {
  const { clubId } = await params

  const authResult = await authorize({
    clubId,
    requiredPermission: "courts.view",
  })

  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  try {
    const courts = await getClubCourts(clubId)
    return NextResponse.json({ success: true, data: courts, error: null })
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener las canchas" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
): Promise<NextResponse<ApiResponse<Court>>> {
  const { clubId } = await params

  const authResult = await authorize({
    clubId,
    requiredPermission: "courts.create",
  })

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

  const parsed = createCourtSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  try {
    const court = await createCourt({ ...parsed.data, club_id: clubId })
    return NextResponse.json({ success: true, data: court, error: null }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Error al crear la cancha" },
      { status: 500 }
    )
  }
}
