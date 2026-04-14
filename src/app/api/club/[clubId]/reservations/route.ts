import { NextRequest, NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { getClubReservations, updateReservationStatus } from "@/features/bookings/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { notifyUser } from "@/features/notifications/utils"
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

  // Verify the reservation belongs to this club and fetch data needed for notification
  const service = createServiceClient()
  const { data: reservation } = await service
    .from("reservations")
    .select("id, user_id, date, start_time, end_time, courts!inner(name, club_id)")
    .eq("id", parsed.data.id)
    .eq("courts.club_id", clubId)
    .maybeSingle()

  if (!reservation) {
    return NextResponse.json({ success: false, error: "Reserva no encontrada en este club" }, { status: 404 })
  }

  try {
    await updateReservationStatus(parsed.data.id, parsed.data.status)

    // Notify the user about the status change — fire-and-forget
    const court = Array.isArray(reservation.courts) ? reservation.courts[0] : reservation.courts
    const courtName = (court as { name?: string } | null)?.name ?? "la cancha"
    const isConfirmed = parsed.data.status === "confirmed"

    void notifyUser(reservation.user_id as string, {
      type:  isConfirmed ? "reservation.confirmed" : "reservation.cancelled",
      title: isConfirmed ? "Reserva confirmada" : "Reserva cancelada",
      body:  isConfirmed
        ? `Tu reserva en ${courtName} el ${reservation.date as string} de ${(reservation.start_time as string).slice(0, 5)} a ${(reservation.end_time as string).slice(0, 5)} fue confirmada.`
        : `Tu reserva en ${courtName} el ${reservation.date as string} de ${(reservation.start_time as string).slice(0, 5)} a ${(reservation.end_time as string).slice(0, 5)} fue cancelada.`,
      metadata: {
        reservation_id: reservation.id,
        date:           reservation.date,
        start_time:     reservation.start_time,
        end_time:       reservation.end_time,
      },
    })

    return NextResponse.json({ success: true, data: null, error: null })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al actualizar reserva"
    return NextResponse.json({ success: false, data: null, error: message }, { status: 500 })
  }
}
