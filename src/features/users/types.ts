import type { AppRole } from "@/features/auth/types"
import type { SportId } from "@/lib/sports/config"

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  first_name: string | null
  last_name: string | null
  city: string | null
  province: string | null
  phone: string | null
  date_of_birth: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
  // Extended fields added by migrations 005 and 009
  username?: string | null
  global_role?: AppRole
  rating?: number | string | null
  ranking_position?: number | null
  matches_played?: number | null
  matches_won?: number | null
  current_streak?: number | null
  // Added by migration 023_profile_settings
  settings?: Record<string, unknown> | null
  // Added by migration 031_pickleball_player_profiles
  preferred_sport?: SportId | null
}

export interface OnboardingInput {
  first_name: string
  last_name: string
  city: string
  province: string
  phone: string
  date_of_birth: string
}

export type PickleballSkillLevel = "beginner" | "intermediate" | "advanced" | "pro"
export type PickleballPlayStyle = "singles" | "doubles" | "both"
export type DominantHand = "right" | "left" | "ambidextrous"

export interface PickleballProfile {
  id: string
  user_id: string
  singles_rating: number | null
  doubles_rating: number | null
  rating_confidence: number
  skill_level: PickleballSkillLevel | null
  dominant_hand: DominantHand | null
  play_style: PickleballPlayStyle | null
  preferred_position: "left" | "right" | "both" | null
  years_playing: number | null
  self_reported_level: number | null
  created_at: string
  updated_at: string
}
