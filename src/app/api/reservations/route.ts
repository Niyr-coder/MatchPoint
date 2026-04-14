import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserReservations, createReservation, cancelReservation } from "@/features/bookings/queries"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { z } from "zod"

const cancelReservationSchema = z.object({
  id: z.string().uuid(),
})

const createReservationSchema = z.object({
  court_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  // total_price is intentionally omitted — calculated server-side from court.price_per_hour
  notes: z.string().max(500).optional(),
})

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

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

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const rl = await checkRateLimit("reservations", user.id, RATE_LIMITS.reservations)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Demasiadas solicitudes. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
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
    // Calculate price server-side — never trust client-provided price
    const { data: court, error: courtErr } = await supabase
      .from("courts")
      .select("price_per_hour")
      .eq("id", parsed.data.court_id)
      .single()

    if (courtErr || !court) {
      return NextResponse.json({ success: false, error: "Cancha no encontrada" }, { status: 404 })
    }

    const durationHours =
      (timeToMinutes(parsed.data.end_time) - timeToMinutes(parsed.data.start_time)) / 60

    if (durationHours <= 0) {
      return NextResponse.json(
        { success: false, error: "El horario de fin debe ser posterior al de inicio" },
        { status: 422 }
      )
    }

    const serverPrice = Math.round(court.price_per_hour * durationHours * 100) / 100

    const reservation = await createReservation(user.id, { ...parsed.data, total_price: serverPrice })
    return NextResponse.json({ success: true, data: reservation }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al crear reserva"

    if (message === "slot_conflict") {
      return NextResponse.json(
        { success: false, error: "Este horario ya fue reservado. Elige otro." },
        { status: 409 }
      )
    }

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
