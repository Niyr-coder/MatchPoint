import { createClient } from "@/lib/supabase/server"
import type { SportType } from "@/lib/courts/queries"

export interface Event {
  id: string
  title: string
  description: string | null
  sport: SportType | null
  location: string | null
  city: string | null
  start_date: string
  end_date: string | null
  image_url: string | null
  is_featured: boolean
  created_by: string | null
  created_at: string
}

export async function getUpcomingEvents(limit = 10): Promise<Event[]> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("start_date", now)
    .order("start_date")
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []) as Event[]
}

export async function getFeaturedEvents(): Promise<Event[]> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("is_featured", true)
    .gte("start_date", now)
    .order("start_date")
    .limit(5)

  if (error) throw new Error(error.message)
  return (data ?? []) as Event[]
}

export async function getAllEvents(page = 0, pageSize = 12): Promise<{ events: Event[]; total: number }> {
  const supabase = await createClient()

  const { data, error, count } = await supabase
    .from("events")
    .select("*", { count: "exact" })
    .order("start_date")
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (error) throw new Error(error.message)
  return { events: (data ?? []) as Event[], total: count ?? 0 }
}
