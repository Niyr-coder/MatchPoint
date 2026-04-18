import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { getClubCourts, createCourt } from "@/features/clubs/queries/courts"
import type { ApiResponse } from "@/types"
import type { Court } from "@/features/clubs/queries/courts"
import { ok, fail } from "@/lib/api/response"

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
    return fail("No autorizado", 403)
  }

  try {
    const courts = await getClubCourts(clubId)
    return ok(courts)
  } catch {
    return fail("Error al obtener las canchas", 500)
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
    return fail("No autorizado", 403)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Cuerpo de solicitud inválido")
  }

  const parsed = createCourtSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  try {
    const court = await createCourt({ ...parsed.data, club_id: clubId })
    return ok(court, 201)
  } catch {
    return fail("Error al crear la cancha", 500)
  }
}
