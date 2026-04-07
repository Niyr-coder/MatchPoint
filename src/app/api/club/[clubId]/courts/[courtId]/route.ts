import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { updateCourt, deactivateCourt } from "@/features/clubs/queries/courts"
import type { ApiResponse } from "@/types"
import type { Court } from "@/features/clubs/queries/courts"

const updateCourtSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sport: z.enum(["futbol", "padel", "tenis", "pickleball"]).optional(),
  surface_type: z.string().max(100).nullable().optional(),
  is_indoor: z.boolean().optional(),
  price_per_hour: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; courtId: string }> }
): Promise<NextResponse<ApiResponse<Court>>> {
  const { clubId, courtId } = await params

  const authResult = await authorize({
    clubId,
    requiredPermission: "courts.edit",
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

  const parsed = updateCourtSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  try {
    const court = await updateCourt(courtId, parsed.data)
    return NextResponse.json({ success: true, data: court, error: null })
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Error al actualizar la cancha" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string; courtId: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  const { clubId, courtId } = await params

  const authResult = await authorize({
    clubId,
    requiredPermission: "courts.edit",
  })

  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  try {
    await deactivateCourt(courtId)
    return NextResponse.json({ success: true, data: null, error: null })
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Error al desactivar la cancha" },
      { status: 500 }
    )
  }
}
