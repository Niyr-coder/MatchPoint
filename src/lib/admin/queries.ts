import { createServiceClient } from "@/lib/supabase/server"
import type { Club } from "@/types"

export interface ClubAdmin extends Club {
  members_count: number
  courts_count: number
}

export interface UserAdmin {
  id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  global_role: string
  created_at: string
  city: string | null
  province: string | null
}

export interface PlatformAnalytics {
  totalUsers: number
  totalClubs: number
  totalReservations: number
  totalTournaments: number
  newUsersThisMonth: number
  reservationsThisMonth: number
  activityLast7Days: Array<{ day: string; value: number }>
}

export async function getAllClubsAdmin(
  filters?: { search?: string; province?: string }
): Promise<ClubAdmin[]> {
  try {
    const supabase = await createServiceClient()

    let query = supabase
      .from("clubs")
      .select("*")
      .order("created_at", { ascending: false })

    if (filters?.province) {
      query = query.eq("province", filters.province)
    }

    if (filters?.search) {
      query = query.ilike("name", `%${filters.search}%`)
    }

    const { data: clubs, error } = await query
    if (error) throw new Error(error.message)
    if (!clubs || clubs.length === 0) return []

    const clubIds = clubs.map((c: Club) => c.id)

    const [membersRes, courtsRes] = await Promise.all([
      supabase
        .from("club_members")
        .select("club_id")
        .in("club_id", clubIds)
        .eq("is_active", true),
      supabase
        .from("courts")
        .select("club_id")
        .in("club_id", clubIds)
        .eq("is_active", true),
    ])

    const membersCount: Record<string, number> = {}
    const courtsCount: Record<string, number> = {}

    for (const m of membersRes.data ?? []) {
      const key = m.club_id as string
      membersCount[key] = (membersCount[key] ?? 0) + 1
    }

    for (const c of courtsRes.data ?? []) {
      const key = c.club_id as string
      courtsCount[key] = (courtsCount[key] ?? 0) + 1
    }

    return clubs.map((club: Club) => ({
      ...club,
      members_count: membersCount[club.id] ?? 0,
      courts_count: courtsCount[club.id] ?? 0,
    }))
  } catch {
    return []
  }
}

export async function getAllUsersAdmin(
  filters?: { search?: string; role?: string }
): Promise<UserAdmin[]> {
  try {
    const supabase = await createServiceClient()

    let query = supabase
      .from("profiles")
      .select("id, full_name, first_name, last_name, global_role, created_at, city, province")
      .order("created_at", { ascending: false })

    if (filters?.role) {
      query = query.eq("global_role", filters.role)
    }

    if (filters?.search) {
      query = query.ilike("full_name", `%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as UserAdmin[]
  } catch {
    return []
  }
}

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  try {
    const supabase = await createServiceClient()

    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0]

    // Last 7 days for activity chart
    const day0 = new Date(now); day0.setDate(now.getDate() - 6); day0.setHours(0, 0, 0, 0)

    const [
      usersRes,
      clubsRes,
      reservationsRes,
      tournamentsRes,
      newUsersRes,
      reservationsMonthRes,
      activityRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("clubs").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("reservations").select("id", { count: "exact", head: true }).neq("status", "cancelled"),
      supabase.from("tournaments").select("id", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", firstOfMonth),
      supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", firstOfMonth)
        .neq("status", "cancelled"),
      supabase
        .from("reservations")
        .select("created_at")
        .gte("created_at", day0.toISOString())
        .neq("status", "cancelled"),
    ])

    // Build 7-day activity bars from raw reservation timestamps
    const DAY_LABELS = ["D", "L", "M", "X", "J", "V", "S"]
    const activityLast7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(day0); d.setDate(day0.getDate() + i)
      const dateStr = d.toISOString().split("T")[0]
      const count = (activityRes.data ?? []).filter(
        (r) => r.created_at.startsWith(dateStr)
      ).length
      return { day: DAY_LABELS[d.getDay()], value: count }
    })

    return {
      totalUsers: usersRes.count ?? 0,
      totalClubs: clubsRes.count ?? 0,
      totalReservations: reservationsRes.count ?? 0,
      totalTournaments: tournamentsRes.count ?? 0,
      newUsersThisMonth: newUsersRes.count ?? 0,
      reservationsThisMonth: reservationsMonthRes.count ?? 0,
      activityLast7Days,
    }
  } catch {
    return {
      totalUsers: 0,
      totalClubs: 0,
      totalReservations: 0,
      totalTournaments: 0,
      newUsersThisMonth: 0,
      reservationsThisMonth: 0,
      activityLast7Days: [],
    }
  }
}
