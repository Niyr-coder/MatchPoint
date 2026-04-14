import { createClient, createServiceClient } from "@/lib/supabase/server"
import type {
  Reservation,
  ReservationInvite,
  CreateReservationInput,
  ReservationWithProfile,
} from "@/features/bookings/types"

export async function getUserReservations(userId: string): Promise<Reservation[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("reservations")
    .select("*, courts(name, sport, clubs(name))")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(20)

  if (error) throw new Error(error.message)
  return (data ?? []) as Reservation[]
}

export async function getUpcomingReservations(userId: string): Promise<Reservation[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("reservations")
    .select("*, courts(name, sport, clubs(name))")
    .eq("user_id", userId)
    .gte("date", today)
    .neq("status", "cancelled")
    .order("date")
    .order("start_time")
    .limit(5)

  if (error) throw new Error(error.message)
  return (data ?? []) as Reservation[]
}

export async function getReservationInvites(userId: string): Promise<ReservationInvite[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("reservation_invites")
    .select("*, reservations(*, courts(name, sport, clubs(name)))")
    .eq("invited_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as ReservationInvite[]
}

export async function createReservation(
  userId: string,
  input: CreateReservationInput
): Promise<Reservation> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("reserve_slot", {
    p_court_id:    input.court_id,
    p_user_id:     userId,
    p_date:        input.date,
    p_start_time:  input.start_time,
    p_end_time:    input.end_time,
    p_total_price: input.total_price,
    p_notes:       input.notes ?? null,
  })

  if (error) throw new Error(error.message)

  // reserve_slot returns SETOF reservations — Supabase wraps it as an array
  const reservation = Array.isArray(data) ? data[0] : data
  if (!reservation) throw new Error("No reservation returned")

  return reservation as Reservation
}

export async function cancelReservation(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", id)

  if (error) throw new Error(error.message)
}

export async function getAllUserReservations(userId: string): Promise<Reservation[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("reservations")
    .select("*, courts(name, sport, clubs(name))")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("start_time", { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Reservation[]
}

export async function getClubReservations(
  clubId: string,
  filters?: { date?: string; status?: string; courtId?: string }
): Promise<ReservationWithProfile[]> {
  try {
    const supabase = createServiceClient()

    let query = supabase
      .from("reservations")
      .select("*, courts!inner(name, sport, club_id, clubs(name)), profiles(full_name, phone)")
      .eq("courts.club_id", clubId)
      .order("date", { ascending: false })
      .order("start_time", { ascending: false })

    if (filters?.date) {
      query = query.eq("date", filters.date)
    }
    if (filters?.status) {
      query = query.eq("status", filters.status)
    }
    if (filters?.courtId) {
      query = query.eq("court_id", filters.courtId)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as ReservationWithProfile[]
  } catch (err) {
    console.error("[getClubReservations]", err)
    throw err
  }
}

export async function getClubReservationsToday(clubId: string): Promise<ReservationWithProfile[]> {
  const today = new Date().toISOString().split("T")[0]
  return getClubReservations(clubId, { date: today })
}

export async function updateReservationStatus(
  id: string,
  status: "confirmed" | "cancelled"
): Promise<void> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from("reservations")
    .update({ status })
    .eq("id", id)

  if (error) throw new Error(error.message)
}
