import { createClient } from "@/lib/supabase/server"

export type SportType = "futbol" | "padel" | "tenis" | "pickleball"

export interface Court {
  id: string
  club_id: string
  name: string
  sport: SportType
  surface_type: string | null
  is_indoor: boolean
  price_per_hour: number
  is_active: boolean
  created_at: string
  clubs?: { name: string; city: string | null }
}

export interface CourtSchedule {
  id: string
  court_id: string
  day_of_week: number
  open_time: string
  close_time: string
}

export async function getCourts(city?: string): Promise<Court[]> {
  const supabase = await createClient()

  let query = supabase
    .from("courts")
    .select("*, clubs(name, city)")
    .eq("is_active", true)
    .order("name")

  if (city) {
    query = query.eq("clubs.city", city)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data ?? []) as Court[]
}

export async function getCourtById(id: string): Promise<Court | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("courts")
    .select("*, clubs(name, city), court_schedules(*)")
    .eq("id", id)
    .eq("is_active", true)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(error.message)
  }

  return data as Court
}

export async function getCourtsBySport(sport: SportType): Promise<Court[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("courts")
    .select("*, clubs(name, city)")
    .eq("is_active", true)
    .eq("sport", sport)
    .order("name")

  if (error) throw new Error(error.message)
  return (data ?? []) as Court[]
}
