import { createClient } from "@/lib/supabase/server"
import type { SportType } from "@/lib/courts/queries"

export type TournamentStatus = "draft" | "open" | "in_progress" | "completed" | "cancelled"
export type ParticipantStatus = "registered" | "confirmed" | "eliminated" | "winner"

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
  created_at: string
  updated_at: string
  clubs?: { name: string } | null
  participant_count?: number
}

export interface TournamentParticipant {
  id: string
  tournament_id: string
  user_id: string
  status: ParticipantStatus
  registered_at: string
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

export async function getOpenTournaments(): Promise<Tournament[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("tournaments")
    .select("*, clubs(name)")
    .in("status", ["open", "in_progress"])
    .order("start_date")
    .limit(20)

  if (error) throw new Error(error.message)
  return (data ?? []) as Tournament[]
}

export async function getUserTournaments(userId: string): Promise<Tournament[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("tournament_participants")
    .select("tournament_id, tournaments(*, clubs(name))")
    .eq("user_id", userId)
    .order("registered_at", { ascending: false })
    .limit(10)

  if (error) throw new Error(error.message)

  return (data ?? [])
    .map((row) => row.tournaments)
    .filter(Boolean) as unknown as Tournament[]
}

export async function getTournamentById(id: string): Promise<Tournament | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("tournaments")
    .select("*, clubs(name)")
    .eq("id", id)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(error.message)
  }

  return data as Tournament
}

export async function createTournament(
  userId: string,
  input: CreateTournamentInput
): Promise<Tournament> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("tournaments")
    .insert({ ...input, created_by: userId, status: "draft" })
    .select("*, clubs(name)")
    .single()

  if (error) throw new Error(error.message)
  return data as Tournament
}

export async function joinTournament(
  tournamentId: string,
  userId: string
): Promise<TournamentParticipant> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("tournament_participants")
    .insert({ tournament_id: tournamentId, user_id: userId })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as TournamentParticipant
}

export async function isUserInTournament(
  tournamentId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("tournament_participants")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data !== null
}
