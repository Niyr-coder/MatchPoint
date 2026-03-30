import { createClient, createServiceClient } from "@/lib/supabase/server"

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

export async function getCourtsByClub(clubId: string): Promise<Court[]> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from("courts")
    .select("*, clubs(name, city)")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("name")

  if (error) throw new Error(error.message)
  return (data ?? []) as Court[]
}

export async function getClubCourts(clubId: string): Promise<Court[]> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from("courts")
      .select("*")
      .eq("club_id", clubId)
      .order("name")
    if (error) throw new Error(error.message)
    return (data ?? []) as Court[]
  } catch {
    return []
  }
}

export interface CreateCourtInput {
  club_id: string
  name: string
  sport: SportType
  surface_type?: string | null
  is_indoor: boolean
  price_per_hour: number
}

export async function createCourt(input: CreateCourtInput): Promise<Court> {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from("courts")
    .insert({
      club_id: input.club_id,
      name: input.name,
      sport: input.sport,
      surface_type: input.surface_type ?? null,
      is_indoor: input.is_indoor,
      price_per_hour: input.price_per_hour,
      is_active: true,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Court
}

export async function updateCourt(
  id: string,
  input: Partial<CreateCourtInput & { is_active: boolean }>
): Promise<Court> {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from("courts")
    .update({ ...input })
    .eq("id", id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Court
}

export async function deactivateCourt(id: string): Promise<void> {
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from("courts")
    .update({ is_active: false })
    .eq("id", id)
  if (error) throw new Error(error.message)
}

export interface TimeSlot {
  startTime: string
  endTime: string
  available: boolean
}

function addOneHour(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const next = h + 1
  return `${String(next).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

export async function getCourtAvailability(courtId: string, date: string): Promise<TimeSlot[]> {
  const supabase = await createServiceClient()

  const dayOfWeek = new Date(date + "T12:00:00").getDay()

  const { data: schedules, error: schedErr } = await supabase
    .from("court_schedules")
    .select("open_time, close_time")
    .eq("court_id", courtId)
    .eq("day_of_week", dayOfWeek)

  if (schedErr || !schedules || schedules.length === 0) return []

  const { data: existing, error: resErr } = await supabase
    .from("reservations")
    .select("start_time, end_time")
    .eq("court_id", courtId)
    .eq("date", date)
    .neq("status", "cancelled")

  if (resErr) return []

  const bookedMinutes = new Set<number>(
    (existing ?? []).map((r) => timeToMinutes(r.start_time))
  )

  const slots: TimeSlot[] = []

  for (const schedule of schedules) {
    let current = schedule.open_time as string
    const closeMinutes = timeToMinutes(schedule.close_time as string)

    while (timeToMinutes(current) + 60 <= closeMinutes) {
      const next = addOneHour(current)
      slots.push({
        startTime: current,
        endTime: next,
        available: !bookedMinutes.has(timeToMinutes(current)),
      })
      current = next
    }
  }

  return slots
}
