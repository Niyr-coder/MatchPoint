import { createServiceClient } from "@/lib/supabase/server"
import type { Club, SportType } from "@/features/clubs/types"

export interface ClubProfileCourt {
  id: string
  name: string
  price_per_hour: number
  sport: SportType
}

export interface ActiveTournament {
  id: string
  name: string
  sport: string
  status: "open" | "in_progress"
  start_date: string
}

/**
 * Returns the club by slug, or null if not found/inactive
 */
export async function getClubBySlug(slug: string): Promise<Club | null> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("clubs")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle()

    if (error) return null
    return (data ?? null) as Club | null
  } catch {
    return null
  }
}

/**
 * Returns active courts for a club (is_active = true), ordered by name
 * Selects only: id, name, price_per_hour, sport
 */
export async function getClubCourts(clubId: string): Promise<ClubProfileCourt[]> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("courts")
      .select("id, name, price_per_hour, sport")
      .eq("club_id", clubId)
      .eq("is_active", true)
      .order("name")

    if (error) return []
    return (data ?? []) as ClubProfileCourt[]
  } catch {
    return []
  }
}

/**
 * Returns tournaments with status 'open' or 'in_progress' for a club, ordered by start_date
 * Selects: id, name, sport, status, start_date
 */
export async function getClubActiveTournaments(clubId: string): Promise<ActiveTournament[]> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("tournaments")
      .select("id, name, sport, status, start_date")
      .eq("club_id", clubId)
      .in("status", ["open", "in_progress"])
      .order("start_date")

    if (error) return []
    return (data ?? []) as ActiveTournament[]
  } catch {
    return []
  }
}

/**
 * Returns true if userId has an active membership in clubId (club_members table, is_active=true)
 */
export async function isClubMember(userId: string, clubId: string): Promise<boolean> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("club_members")
      .select("id")
      .eq("user_id", userId)
      .eq("club_id", clubId)
      .eq("is_active", true)
      .maybeSingle()

    if (error) return false
    return data !== null
  } catch {
    return false
  }
}

// Re-export types for consumers
export type { Club, SportType }
