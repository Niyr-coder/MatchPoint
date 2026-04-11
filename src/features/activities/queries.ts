import { createClient, createServiceClient } from "@/lib/supabase/server"
import type {
  Event,
  EventWithCount,
  EventRegistration,
  EventRegistrationWithProfile,
  CreateEventInput,
  UpdateEventInput,
  EventFilters,
} from "@/features/activities/types"

export type {
  Event,
  EventWithClub,
  EventWithCount,
  EventWithRegistration,
  EventRegistration,
  EventRegistrationWithProfile,
  CreateEventInput,
  UpdateEventInput,
  EventFilters,
} from "@/features/activities/types"

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

export async function registerForEventAtomic(
  eventId: string,
  userId: string
): Promise<{ id: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("register_for_event", {
    p_event_id: eventId,
    p_user_id: userId,
  })
  if (error) throw new Error(error.message)
  return { id: data as string }
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
