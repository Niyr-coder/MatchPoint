import type { SportType } from "@/features/clubs/types"

export type TournamentStatus = "draft" | "open" | "in_progress" | "completed" | "cancelled"
export type ParticipantStatus = "registered" | "confirmed" | "eliminated" | "winner" | "withdrawn"
export type PaymentStatus = "pending" | "paid" | "waived" | "refunded"
export type EventType = 'tournament' | 'quedada'
export type GameDynamic = 'standard' | 'king_of_court' | 'popcorn' | 'round_robin'

// ── Extras sub-types ───────────────────────────────────────────────────────────

export interface PrizeItem {
  place: string   // "1er lugar", "2do lugar", etc.
  prize: string   // "$200", "Trofeo + medalla", etc.
}

export interface SponsorItem {
  name: string
  logo_url?: string
}

export interface TournamentExtras {
  sorteos?: { enabled: boolean; detail?: string }
  premios?: { enabled: boolean; detail?: string; items?: PrizeItem[] }
  streaming?: { enabled: boolean }
  fotografia?: { enabled: boolean }
  arbitro?: { enabled: boolean }
  patrocinador?: { enabled: boolean; name?: string; sponsors?: SponsorItem[] }
}

// ── Core entities ──────────────────────────────────────────────────────────────

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
  event_type?: EventType
  game_dynamic?: GameDynamic
  created_at: string
  updated_at: string
  clubs?: { name: string } | null
  participant_count?: number
  modality?: string | null
  start_time?: string | null
  court_count?: number | null
  is_official?: boolean
  extras?: TournamentExtras
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
  guest_name?: string | null
  guest_lastname?: string | null
}

export interface TournamentFeedback {
  id: string
  tournament_id: string
  user_id: string
  rating: number
  comment: string | null
  created_at: string
  profiles?: { username: string; full_name: string | null }
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
  event_type?: EventType
  game_dynamic?: GameDynamic
  court_count?: number
  extras?: TournamentExtras
}
