import type { SportType } from "@/features/clubs/types"

export type TournamentStatus = "draft" | "open" | "in_progress" | "completed" | "cancelled"
export type ParticipantStatus = "registered" | "confirmed" | "eliminated" | "winner" | "withdrawn"
export type PaymentStatus = "pending" | "paid" | "waived" | "refunded"

export interface Tournament {
  id: string
  club_id: string | null
  created_by: string
  name: string
  sport: SportType
  description: string | null
  max_participants: number
  start_date: string
  end_date: string | null
  status: TournamentStatus
  entry_fee: number
  bracket_locked: boolean
  created_at: string
  updated_at: string
  clubs?: { name: string } | null
  participant_count?: number
  modality?: string | null
  start_time?: string | null
  is_official?: boolean
  extras?: Record<string, { enabled?: boolean; detail?: string; name?: string }>
}

export interface TournamentParticipant {
  id: string
  tournament_id: string
  user_id: string
  status: ParticipantStatus
  registered_at: string
  // Extended fields added by migration 012
  payment_status?: PaymentStatus
  seed?: number | null
  notes?: string | null
  club_id?: string | null
  confirmed_at?: string | null
}

export interface TournamentExtras {
  sorteos?: { enabled: boolean; detail?: string }
  premios?: { enabled: boolean; detail?: string }
  streaming?: { enabled: boolean }
  fotografia?: { enabled: boolean }
  arbitro?: { enabled: boolean }
  patrocinador?: { enabled: boolean; name?: string }
}

export interface CreateTournamentInput {
  name: string
  sport: SportType
  description?: string
  max_participants?: number
  start_date: string
  end_date?: string
  entry_fee: number
  club_id?: string
  start_time?: string
  modality?: string
  is_official?: boolean
  extras?: TournamentExtras
}
