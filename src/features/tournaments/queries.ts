import { createClient } from "@/lib/supabase/server"
import type {
  Tournament,
  TournamentParticipant,
  CreateTournamentInput,
} from "@/features/tournaments/types"

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

export async function getCreatedTournaments(userId: string): Promise<Tournament[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("tournaments")
    .select("*, clubs(name)")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
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

  // Base fields — always present in the original schema
  const baseInsert = {
    created_by: userId,
    status: "draft" as const,
    name: input.name,
    sport: input.sport,
    description: input.description,
    max_participants: input.max_participants,
    start_date: input.start_date,
    end_date: input.end_date,
    entry_fee: input.entry_fee,
    club_id: input.club_id,
  }

  // Extended fields added by migration 010 — may not exist until migration runs
  const fullInsert = {
    ...baseInsert,
    start_time: input.start_time,
    modality: input.modality,
    is_official: input.is_official ?? false,
    ...(input.event_type ? { event_type: input.event_type } : {}),
    ...(input.game_dynamic ? { game_dynamic: input.game_dynamic } : {}),
    ...(input.court_count != null ? { court_count: input.court_count } : {}),
    extras: input.extras ?? {},
  }

  const { data, error } = await supabase
    .from("tournaments")
    .insert(fullInsert)
    .select("*, clubs(name)")
    .single()

  // If new columns don't exist yet (migration 010 pending), retry with base fields only
  if (error) {
    if (error.message.includes("column") || error.message.includes("schema cache")) {
      const { data: baseData, error: baseError } = await supabase
        .from("tournaments")
        .insert(baseInsert)
        .select("*, clubs(name)")
        .single()
      if (baseError) throw new Error(baseError.message)
      return baseData as Tournament
    }
    throw new Error(error.message)
  }

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

export interface ParticipantPreview {
  user_id: string
  full_name: string | null
  avatar_url: string | null
}

export async function getTournamentParticipantsPreview(
  tournamentId: string,
  limit = 10
): Promise<{ participants: ParticipantPreview[]; total: number }> {
  const supabase = await createClient()

  const { data, error, count } = await supabase
    .from("tournament_participants")
    .select("user_id, profiles(full_name, avatar_url)", { count: "exact" })
    .eq("tournament_id", tournamentId)
    .neq("status", "withdrawn")
    .order("registered_at")
    .limit(limit)

  if (error) throw new Error(error.message)

  const participants = (data ?? []).map((row) => {
    const profile = (row.profiles as unknown) as { full_name: string | null; avatar_url: string | null } | null
    return {
      user_id: row.user_id as string,
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    }
  })

  return { participants, total: count ?? 0 }
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
    .neq("status", "withdrawn")
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data !== null
}
