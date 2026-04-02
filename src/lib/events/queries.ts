import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { SportType } from "@/lib/courts/queries"

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export type EventType =
  | "social"
  | "clinic"
  | "workshop"
  | "open_day"
  | "exhibition"
  | "masterclass"
  | "quedada"
  | "other"

export type EventStatus = "draft" | "published" | "cancelled" | "completed"

export type EventVisibility = "public" | "club_only" | "invite_only"

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
  // New columns from migration 030
  club_id: string | null
  event_type: EventType
  status: EventStatus
  max_capacity: number | null
  price: number
  is_free: boolean
  visibility: EventVisibility
  registration_deadline: string | null
  min_participants: number | null
  tags: string[]
  updated_at: string | null
  organizer_name: string | null
  organizer_contact: string | null
}

export interface EventWithCount extends Event {
  registration_count: number
}

export interface EventWithRegistration extends EventWithCount {
  is_registered: boolean
}

export interface EventRegistration {
  id: string
  event_id: string
  user_id: string
  registered_at: string
}

export interface EventRegistrationWithProfile extends EventRegistration {
  profiles: {
    id: string
    full_name: string | null
    avatar_url: string | null
    username: string | null
  } | null
}

export interface CreateEventInput {
  title: string
  description?: string | null
  sport?: SportType | null
  event_type: EventType
  club_id?: string | null
  location: string
  city: string
  start_date: string
  end_date?: string | null
  image_url?: string | null
  max_capacity?: number | null
  price?: number
  is_free: boolean
  visibility: EventVisibility
  registration_deadline?: string | null
  min_participants?: number | null
  tags?: string[]
  organizer_name?: string | null
  organizer_contact?: string | null
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  status?: EventStatus
  is_featured?: boolean
}

export interface EventFilters {
  sport?: string
  event_type?: string
  city?: string
  club_id?: string
  status?: string
  is_free?: boolean
  from_date?: string
  to_date?: string
  search?: string
  page?: number
  limit?: number
}

// ──────────────────────────────────────────────────────────
// Existing public query functions (preserved)
// ──────────────────────────────────────────────────────────

export async function getUpcomingEvents(limit = 10): Promise<Event[]> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
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
    .eq("status", "published")
    .gte("start_date", now)
    .order("start_date")
    .limit(5)

  if (error) throw new Error(error.message)
  return (data ?? []) as Event[]
}

export async function getAllEvents(
  page = 0,
  pageSize = 12
): Promise<{ events: Event[]; total: number }> {
  const supabase = await createClient()

  const { data, error, count } = await supabase
    .from("events")
    .select("*", { count: "exact" })
    .eq("status", "published")
    .order("start_date")
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (error) throw new Error(error.message)
  return { events: (data ?? []) as Event[], total: count ?? 0 }
}

// ──────────────────────────────────────────────────────────
// Single event
// ──────────────────────────────────────────────────────────

export async function getEventById(id: string): Promise<EventWithCount | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("events")
    .select("*, event_registrations(count)")
    .eq("id", id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const { event_registrations, ...rest } = data as Event & {
    event_registrations: { count: number }[]
  }

  return {
    ...rest,
    registration_count:
      Array.isArray(event_registrations) && event_registrations.length > 0
        ? Number(event_registrations[0].count)
        : 0,
  }
}

// ──────────────────────────────────────────────────────────
// Filtered list (used by the public GET with query params)
// ──────────────────────────────────────────────────────────

export async function getFilteredEvents(
  filters: EventFilters
): Promise<{ events: Event[]; total: number }> {
  const supabase = await createClient()
  const {
    sport,
    event_type,
    city,
    club_id,
    status = "published",
    is_free,
    from_date,
    to_date,
    search,
    page = 0,
    limit: pageSize = 12,
  } = filters

  let query = supabase
    .from("events")
    .select("*", { count: "exact" })
    .eq("status", status)

  if (sport) query = query.eq("sport", sport)
  if (event_type) query = query.eq("event_type", event_type)
  if (city) query = query.ilike("city", `%${city}%`)
  if (club_id) query = query.eq("club_id", club_id)
  if (is_free !== undefined) query = query.eq("is_free", is_free)
  if (from_date) query = query.gte("start_date", from_date)
  if (to_date) query = query.lte("start_date", to_date)
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,description.ilike.%${search}%,city.ilike.%${search}%`
    )
  }

  const { data, error, count } = await query
    .order("start_date")
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (error) throw new Error(error.message)
  return { events: (data ?? []) as Event[], total: count ?? 0 }
}

// ──────────────────────────────────────────────────────────
// Mutations (service client — bypasses RLS)
// ──────────────────────────────────────────────────────────

export async function createEvent(
  input: CreateEventInput,
  userId: string
): Promise<Event> {
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("events")
    .insert({
      ...input,
      tags: input.tags ?? [],
      price: input.price ?? 0,
      status: "draft",
      created_by: userId,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Event
}

export async function updateEvent(
  id: string,
  input: UpdateEventInput
): Promise<Event> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("events")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Event
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = createServiceClient()

  const { error } = await supabase.from("events").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

// ──────────────────────────────────────────────────────────
// Registrations
// ──────────────────────────────────────────────────────────

export async function getEventRegistrations(
  eventId: string
): Promise<EventRegistrationWithProfile[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("event_registrations")
    .select("*, profiles(id, full_name, avatar_url, username)")
    .eq("event_id", eventId)
    .order("registered_at")

  if (error) throw new Error(error.message)
  return (data ?? []) as EventRegistrationWithProfile[]
}

export async function getUserEventRegistration(
  eventId: string,
  userId: string
): Promise<EventRegistration | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("event_registrations")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as EventRegistration | null
}

export async function registerForEvent(
  eventId: string,
  userId: string
): Promise<EventRegistration> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("event_registrations")
    .insert({ event_id: eventId, user_id: userId })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as EventRegistration
}

export async function unregisterFromEvent(
  eventId: string,
  userId: string
): Promise<void> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from("event_registrations")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId)

  if (error) throw new Error(error.message)
}

export async function getMyRegistrations(userId: string): Promise<Event[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("event_registrations")
    .select("events(*)")
    .eq("user_id", userId)
    .order("registered_at", { ascending: false })

  if (error) throw new Error(error.message)

  type RegistrationWithEvent = { events: Event[] | null }

  return (data ?? [] as RegistrationWithEvent[])
    .flatMap((row: RegistrationWithEvent) => row.events ?? [])
}

// ──────────────────────────────────────────────────────────
// Admin / scoped queries
// ──────────────────────────────────────────────────────────

export async function getAllEventsAdmin(
  filters: Omit<EventFilters, "status"> = {}
): Promise<{ events: Event[]; total: number }> {
  const supabase = createServiceClient()
  const {
    sport,
    event_type,
    city,
    club_id,
    is_free,
    from_date,
    to_date,
    search,
    page = 0,
    limit: pageSize = 20,
  } = filters

  let query = supabase
    .from("events")
    .select("*", { count: "exact" })

  if (sport) query = query.eq("sport", sport)
  if (event_type) query = query.eq("event_type", event_type)
  if (city) query = query.ilike("city", `%${city}%`)
  if (club_id) query = query.eq("club_id", club_id)
  if (is_free !== undefined) query = query.eq("is_free", is_free)
  if (from_date) query = query.gte("start_date", from_date)
  if (to_date) query = query.lte("start_date", to_date)
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,description.ilike.%${search}%,city.ilike.%${search}%`
    )
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (error) throw new Error(error.message)
  return { events: (data ?? []) as Event[], total: count ?? 0 }
}

export async function getClubEvents(
  clubId: string,
  page = 0,
  pageSize = 12
): Promise<{ events: Event[]; total: number }> {
  const supabase = createServiceClient()

  const { data, error, count } = await supabase
    .from("events")
    .select("*", { count: "exact" })
    .eq("club_id", clubId)
    .order("start_date")
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (error) throw new Error(error.message)
  return { events: (data ?? []) as Event[], total: count ?? 0 }
}
