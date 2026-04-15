import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { Quedada, QuedadaParticipant } from "@/features/organizer/types"

/** Fetch all quedadas created by a specific user, ordered by start_date desc */
export async function getOrganizerQuedadas(userId: string): Promise<Quedada[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("tournaments")
    .select("*, clubs(name)")
    .eq("event_type", "quedada")
    .eq("created_by", userId)
    .order("start_date", { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Quedada[]
}

/** Fetch a single quedada by id — returns null if not found */
export async function getQuedadaById(id: string): Promise<Quedada | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("tournaments")
    .select("*, clubs(name)")
    .eq("id", id)
    .eq("event_type", "quedada")
    .single()

  if (error) {
    // PGRST116 = "no rows returned" — not an operational error
    if (error.code === "PGRST116") return null
    throw new Error(error.message)
  }

  return data as unknown as Quedada
}

/** Fetch all participants for a quedada, including guest info and joined profile */
export async function getQuedadaParticipants(
  quedadaId: string
): Promise<QuedadaParticipant[]> {
  const service = createServiceClient()

  const { data, error } = await service
    .from("tournament_participants")
    .select(`
      id,
      user_id,
      status,
      guest_name,
      guest_lastname,
      registered_at,
      profiles!tp_user_profile_fk (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq("tournament_id", quedadaId)
    .order("registered_at", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as QuedadaParticipant[]
}

/** Search registered users by username or full_name (used in AddPlayerModal) */
export async function searchUsers(
  query: string,
  limit = 5
): Promise<
  Array<{
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  }>
> {
  const service = createServiceClient()
  const q = `%${query.toLowerCase()}%`

  const { data, error } = await service
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .or(`username.ilike.${q},full_name.ilike.${q}`)
    .limit(limit)

  if (error) throw new Error(error.message)
  return data ?? []
}
