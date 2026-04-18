import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserReservations, createReservation, cancelReservation } from "@/features/bookings/queries"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { notifyClubStaff, notifyAdmins } from "@/features/notifications/utils"
import { z } from "zod"
import { ok, fail } from "@/lib/api/response"

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

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return fail("Unauthorized", 401)
  }

  const url = new URL(request.url)
  const userId = url.searchParams.get('user_id')

  if (userId && userId !== user.id) {
    return fail("Acceso denegado", 403)
  }

  try {
    const reservations = await getUserReservations(user.id)
    return ok(reservations)
  } catch (error: unknown) {
    console.error("[GET /api/reservations]", error)
    return fail("Error al obtener reservas", 500)
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return fail("Unauthorized", 401)
  }

  const rl = await checkRateLimit("reservations", user.id, RATE_LIMITS.reservations)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta más tarde.", 429)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Invalid JSON")
  }

  const parsed = createReservationSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  // Reject past dates and past time slots for today
  const nowUtcMinus5 = new Date(Date.now() - 5 * 60 * 60 * 1000)
  const todayStr = nowUtcMinus5.toISOString().split("T")[0]
  const currentMinutes = nowUtcMinus5.getUTCHours() * 60 + nowUtcMinus5.getUTCMinutes()
  const startMinutes = timeToMinutes(parsed.data.start_time)

  if (parsed.data.date < todayStr) {
    return fail("No puedes reservar en fechas pasadas.", 422)
  }

  if (parsed.data.date === todayStr && startMinutes <= currentMinutes) {
    return fail("No puedes reservar en horarios que ya pasaron.", 422)
  }

  try {
    // Calculate price server-side — never trust client-provided price
    const { data: court, error: courtErr } = await supabase
      .from("courts")
      .select("price_per_hour, name")
      .eq("id", parsed.data.court_id)
      .single()

    if (courtErr || !court) {
      return fail("Cancha no encontrada", 404)
    }

    const durationHours =
      (timeToMinutes(parsed.data.end_time) - timeToMinutes(parsed.data.start_time)) / 60

    if (durationHours <= 0) {
      return fail("El horario de fin debe ser posterior al de inicio", 422)
    }

    const serverPrice = Math.round(court.price_per_hour * durationHours * 100) / 100

    const reservation = await createReservation(user.id, { ...parsed.data, total_price: serverPrice })

    // Notify club owners/managers and platform admins — fire-and-forget
    const notificationPayload = {
      type:  "reservation.new",
      title: "Nueva reserva pendiente",
      body:  `Se solicitó ${court.name} para el ${parsed.data.date} de ${parsed.data.start_time.slice(0, 5)} a ${parsed.data.end_time.slice(0, 5)}.`,
      metadata: {
        reservation_id: reservation.id,
        court_id:       parsed.data.court_id,
        court_name:     court.name,
        date:           parsed.data.date,
        start_time:     parsed.data.start_time,
        end_time:       parsed.data.end_time,
      },
    }
    void notifyClubStaff(parsed.data.court_id, notificationPayload)
    void notifyAdmins(notificationPayload)

    return ok(reservation, 201)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al crear reserva"

    if (message === "slot_conflict") {
      return fail("Este horario ya fue reservado. Elige otro.", 409)
    }

    console.error("[POST /api/reservations]", error)
    return fail("Error al crear reserva", 500)
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return fail("Unauthorized", 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Invalid JSON")
  }

  const parsed = cancelReservationSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  // Verify ownership before cancelling
  const { data: reservation, error: fetchError } = await supabase
    .from("reservations")
    .select("id, user_id, status")
    .eq("id", parsed.data.id)
    .single()

  if (fetchError || !reservation) {
    return fail("Reserva no encontrada", 404)
  }

  if (reservation.user_id !== user.id) {
    return fail("Acceso denegado", 403)
  }

  if (reservation.status === "cancelled") {
    return fail("La reserva ya está cancelada", 409)
  }

  try {
    await cancelReservation(parsed.data.id)
    return ok(null)
  } catch (error: unknown) {
    console.error("[PATCH /api/reservations]", error)
    return fail("Error al cancelar reserva", 500)
  }
}
