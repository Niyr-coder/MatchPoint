import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserReservations, createReservation, cancelReservation } from "@/features/bookings/queries"
import { z } from "zod"

const cancelReservationSchema = z.object({
  id: z.string().uuid(),
})

const createReservationSchema = z.object({
  court_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  total_price: z.number().min(0),
  notes: z.string().max(500).optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const reservations = await getUserReservations(user.id)
    return NextResponse.json({ success: true, data: reservations })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener reservas"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createReservationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  try {
    const reservation = await createReservation(user.id, parsed.data)
    return NextResponse.json({ success: true, data: reservation }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al crear reserva"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = cancelReservationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  // Verify ownership before cancelling
  const { data: reservation, error: fetchError } = await supabase
    .from("reservations")
    .select("id, user_id, status")
    .eq("id", parsed.data.id)
    .single()

  if (fetchError || !reservation) {
    return NextResponse.json({ success: false, error: "Reserva no encontrada" }, { status: 404 })
  }

  if (reservation.user_id !== user.id) {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 })
  }

  if (reservation.status === "cancelled") {
    return NextResponse.json({ success: false, error: "La reserva ya está cancelada" }, { status: 409 })
  }

  try {
    await cancelReservation(parsed.data.id)
    return NextResponse.json({ success: true, data: null })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al cancelar reserva"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
