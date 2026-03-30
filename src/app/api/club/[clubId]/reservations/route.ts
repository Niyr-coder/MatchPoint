import { NextRequest, NextResponse } from "next/server"
import { authorize } from "@/lib/auth/authorization"
import { getClubReservations, updateReservationStatus } from "@/lib/reservations/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { z } from "zod"

const updateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["confirmed", "cancelled"]),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params

  const authResult = await authorize({ clubId, requiredPermission: "reservations.view" })
  if (!authResult.ok) {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const date = searchParams.get("date") ?? undefined
  const status = searchParams.get("status") ?? undefined
  const courtId = searchParams.get("courtId") ?? undefined

  try {
    const reservations = await getClubReservations(clubId, { date, status, courtId })
    return NextResponse.json({ success: true, data: reservations, error: null })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener reservas"
    return NextResponse.json({ success: false, data: null, error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params

  const authResult = await authorize({ clubId, requiredPermission: "reservations.cancel" })
  if (!authResult.ok) {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 })
  }

  const parsed = updateStatusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  // Verify the reservation belongs to this club (via court → club relationship)
  const service = await createServiceClient()
  const { data: authResult2 } = await service
    .from("reservations")
    .select("id, courts!inner(club_id)")
    .eq("id", parsed.data.id)
    .eq("courts.club_id", clubId)
    .maybeSingle()

  if (!authResult2) {
    return NextResponse.json({ success: false, error: "Reserva no encontrada en este club" }, { status: 404 })
  }

  try {
    await updateReservationStatus(parsed.data.id, parsed.data.status)
    return NextResponse.json({ success: true, data: null, error: null })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al actualizar reserva"
    return NextResponse.json({ success: false, data: null, error: message }, { status: 500 })
  }
}
