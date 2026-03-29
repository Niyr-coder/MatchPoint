import { createClient } from "@/lib/supabase/server"

export type ReservationStatus = "pending" | "confirmed" | "cancelled"
export type InviteStatus = "pending" | "accepted" | "declined"

export interface Reservation {
  id: string
  court_id: string
  user_id: string
  date: string
  start_time: string
  end_time: string
  status: ReservationStatus
  total_price: number
  notes: string | null
  created_at: string
  updated_at: string
  courts?: { name: string; sport: string; clubs?: { name: string } }
}

export interface ReservationInvite {
  id: string
  reservation_id: string
  invited_user_id: string
  status: InviteStatus
  created_at: string
  reservations?: Reservation
}

export interface CreateReservationInput {
  court_id: string
  date: string
  start_time: string
  end_time: string
  total_price: number
  notes?: string
}

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

  const { data, error } = await supabase
    .from("reservations")
    .insert({ ...input, user_id: userId })
    .select("*, courts(name, sport, clubs(name))")
    .single()

  if (error) throw new Error(error.message)
  return data as Reservation
}

export async function cancelReservation(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", id)

  if (error) throw new Error(error.message)
}
