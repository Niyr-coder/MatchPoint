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

export interface ReservationWithProfile extends Reservation {
  profiles?: { full_name: string | null; phone: string | null }
}
