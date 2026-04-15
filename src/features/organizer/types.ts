import type { Tournament, TournamentParticipant } from "@/features/tournaments/types"
import type { GameDynamic } from "@/features/tournaments/types"

export type { GameDynamic }

/** Quedada is a Tournament with event_type = 'quedada' */
export type Quedada = Tournament & {
  event_type: 'quedada'
  game_dynamic: GameDynamic
}

/** Participant that may be a guest (no user_id) */
export interface QuedadaParticipant extends Omit<TournamentParticipant, 'user_id'> {
  user_id: string | null
  guest_name?: string | null
  guest_lastname?: string | null
  /** Joined profile data when user_id is present */
  profiles?: {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  } | null
}

export interface CreateQuedadaInput {
  name: string
  game_dynamic: GameDynamic
  modality: string
  max_participants: 4 | 8 | 16 | 32
  start_date: string
  start_time: string
  club_id?: string
  is_public?: boolean
  court_count?: number
}
