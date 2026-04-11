import { createServiceClient } from "@/lib/supabase/server"
import type { Club } from "@/types"

// ============================================================
// Analytics
// ============================================================

export interface AdminAnalytics {
  usersByMonth: Array<{ month: string; count: number }>
  reservationsByMonth: Array<{ month: string; count: number; revenue: number }>
  topClubs: Array<{ club_id: string; name: string; reservation_count: number }>
  tournamentsByStatus: Array<{ status: string; count: number }>
  totalRevenue: number
  revenueThisMonth: number
}

// ============================================================
// Financials
// ============================================================

export interface AdminFinancials {
  totalRevenue: number
  revenueThisMonth: number
  revenueLastMonth: number
  totalReservations: number
  reservationsThisMonth: number
  avgReservationValue: number
  topClubsByRevenue: Array<{ club_id: string; name: string; revenue: number; reservations: number }>
  tournamentRevenue: number
}

// ============================================================
// Tournaments (admin view)
// ============================================================

export interface TournamentAdmin {
  id: string
  name: string
  sport: string
  status: string
  entry_fee: number
  max_participants: number
  participant_count: number
  start_date: string
  end_date: string | null
  club_name: string | null
  created_at: string
  modality: string | null
}

// ============================================================
// Moderation
// ============================================================

export interface AdminModerationData {
  pendingClubs: Array<{
    id: string
    name: string
    city: string | null
    province: string | null
    created_at: string
    owner_name: string | null
  }>
  recentUsers: Array<{
    id: string
    full_name: string | null
    username: string | null
    global_role: string
    created_at: string
    city: string | null
  }>
  inactiveClubs: Array<{ id: string; name: string; city: string | null; created_at: string }>
}

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
  username: string | null
  avatar_url: string | null
  rating: number | null
  matches_played: number | null
  /** JSONB settings; contains `suspended_from_role` key when account is suspended */
  settings: Record<string, unknown> | null
  /** Whether the account has been manually verified by an admin */
  is_verified: boolean | null
  /** Origin of the account: 'email', 'google', 'admin_created', 'invite' */
  account_origin: string | null
  /** Timestamp when the account was verified */
  verified_at: string | null
  /** ID of the admin who verified the account */
  verified_by: string | null
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
    const supabase = createServiceClient()

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
    const supabase = createServiceClient()

    let query = supabase
      .from("profiles")
      .select("id, full_name, first_name, last_name, global_role, created_at, city, province, username, avatar_url, rating, matches_played, settings, is_verified, account_origin, verified_at, verified_by")
      .order("created_at", { ascending: false })

    if (filters?.role) {
      query = query.eq("global_role", filters.role)
    }

    if (filters?.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,username.ilike.%${filters.search}%`)
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
    const supabase = createServiceClient()

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

// ---- helpers -------------------------------------------------------

function monthLabel(date: Date): string {
  return date.toLocaleDateString("es-EC", { month: "short", year: "2-digit" })
}

function last6MonthsRange(): { start: Date; months: Date[] } {
  const now = new Date()
  const months: Date[] = []
  for (let i = 5; i >= 0; i--) {
    months.push(new Date(now.getFullYear(), now.getMonth() - i, 1))
  }
  return { start: months[0], months }
}

// ---- getAdminAnalytics ---------------------------------------------

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const EMPTY: AdminAnalytics = {
    usersByMonth: [],
    reservationsByMonth: [],
    topClubs: [],
    tournamentsByStatus: [],
    totalRevenue: 0,
    revenueThisMonth: 0,
  }

  try {
    const supabase = createServiceClient()
    const { start, months } = last6MonthsRange()

    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [usersRes, reservationsRes, clubsRes, tournamentsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", start.toISOString()),
      supabase
        .from("reservations")
        .select("created_at, total_price, club_id")
        .gte("created_at", start.toISOString())
        .neq("status", "cancelled"),
      supabase.from("clubs").select("id, name"),
      supabase.from("tournaments").select("status"),
    ])

    // --- usersByMonth
    const usersByMonth = months.map((m) => {
      const next = new Date(m.getFullYear(), m.getMonth() + 1, 1)
      const count = (usersRes.data ?? []).filter((u) => {
        const d = new Date(u.created_at)
        return d >= m && d < next
      }).length
      return { month: monthLabel(m), count }
    })

    // --- reservationsByMonth
    const reservationsByMonth = months.map((m) => {
      const next = new Date(m.getFullYear(), m.getMonth() + 1, 1)
      const rows = (reservationsRes.data ?? []).filter((r) => {
        const d = new Date(r.created_at)
        return d >= m && d < next
      })
      const revenue = rows.reduce((sum, r) => sum + (Number(r.total_price) || 0), 0)
      return { month: monthLabel(m), count: rows.length, revenue }
    })

    // --- topClubs
    const clubMap: Record<string, number> = {}
    for (const r of reservationsRes.data ?? []) {
      if (r.club_id) clubMap[r.club_id] = (clubMap[r.club_id] ?? 0) + 1
    }
    const clubsById: Record<string, string> = {}
    for (const c of clubsRes.data ?? []) clubsById[c.id] = c.name
    const topClubs = Object.entries(clubMap)
      .map(([club_id, reservation_count]) => ({
        club_id,
        name: clubsById[club_id] ?? club_id,
        reservation_count,
      }))
      .sort((a, b) => b.reservation_count - a.reservation_count)
      .slice(0, 5)

    // --- tournamentsByStatus
    const statusMap: Record<string, number> = {}
    for (const t of tournamentsRes.data ?? []) {
      statusMap[t.status] = (statusMap[t.status] ?? 0) + 1
    }
    const tournamentsByStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }))

    // --- revenue
    const allRevRows = (reservationsRes.data ?? [])
    const totalRevenue = allRevRows.reduce((sum, r) => sum + (Number(r.total_price) || 0), 0)
    const revenueThisMonth = allRevRows
      .filter((r) => new Date(r.created_at) >= new Date(firstOfMonth))
      .reduce((sum, r) => sum + (Number(r.total_price) || 0), 0)

    return { usersByMonth, reservationsByMonth, topClubs, tournamentsByStatus, totalRevenue, revenueThisMonth }
  } catch {
    return EMPTY
  }
}

// ---- getAdminFinancials --------------------------------------------

export async function getAdminFinancials(): Promise<AdminFinancials> {
  const EMPTY: AdminFinancials = {
    totalRevenue: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0,
    totalReservations: 0,
    reservationsThisMonth: 0,
    avgReservationValue: 0,
    topClubsByRevenue: [],
    tournamentRevenue: 0,
  }

  try {
    const supabase = createServiceClient()

    const now = new Date()
    const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const firstLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

    const [reservationsRes, clubsRes, tournamentParticipantsRes] = await Promise.all([
      supabase
        .from("reservations")
        .select("created_at, total_price, club_id")
        .neq("status", "cancelled"),
      supabase.from("clubs").select("id, name"),
      supabase
        .from("tournament_participants")
        .select("tournament_id, tournaments(entry_fee)")
        .eq("payment_status", "paid"),
    ])

    const rows = reservationsRes.data ?? []

    const totalRevenue = rows.reduce((s, r) => s + (Number(r.total_price) || 0), 0)
    const totalReservations = rows.length

    const thisMonthRows = rows.filter((r) => new Date(r.created_at) >= new Date(firstThisMonth))
    const lastMonthRows = rows.filter((r) => {
      const d = new Date(r.created_at)
      return d >= new Date(firstLastMonth) && d < new Date(firstThisMonth)
    })

    const revenueThisMonth = thisMonthRows.reduce((s, r) => s + (Number(r.total_price) || 0), 0)
    const revenueLastMonth = lastMonthRows.reduce((s, r) => s + (Number(r.total_price) || 0), 0)
    const reservationsThisMonth = thisMonthRows.length
    const avgReservationValue = totalReservations > 0 ? totalRevenue / totalReservations : 0

    // top clubs by revenue
    const clubRevMap: Record<string, { revenue: number; reservations: number }> = {}
    for (const r of rows) {
      if (!r.club_id) continue
      const cur = clubRevMap[r.club_id] ?? { revenue: 0, reservations: 0 }
      clubRevMap[r.club_id] = {
        revenue: cur.revenue + (Number(r.total_price) || 0),
        reservations: cur.reservations + 1,
      }
    }
    const clubsById: Record<string, string> = {}
    for (const c of clubsRes.data ?? []) clubsById[c.id] = c.name
    const topClubsByRevenue = Object.entries(clubRevMap)
      .map(([club_id, v]) => ({ club_id, name: clubsById[club_id] ?? club_id, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // tournament revenue
    const tournamentRevenue = (tournamentParticipantsRes.data ?? []).reduce((s, p) => {
      const fee = Number((p.tournaments as { entry_fee?: number } | null)?.entry_fee ?? 0)
      return s + fee
    }, 0)

    return {
      totalRevenue,
      revenueThisMonth,
      revenueLastMonth,
      totalReservations,
      reservationsThisMonth,
      avgReservationValue,
      topClubsByRevenue,
      tournamentRevenue,
    }
  } catch {
    return EMPTY
  }
}

// ---- getAllTournamentsAdmin -----------------------------------------

export async function getAllTournamentsAdmin(): Promise<TournamentAdmin[]> {
  try {
    const supabase = createServiceClient()

    const [tournamentsRes, participantsRes] = await Promise.all([
      supabase
        .from("tournaments")
        .select("id, name, sport, status, entry_fee, max_participants, start_date, end_date, created_at, modality, clubs(name)")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("tournament_participants").select("tournament_id"),
    ])

    const participantCount: Record<string, number> = {}
    for (const p of participantsRes.data ?? []) {
      participantCount[p.tournament_id] = (participantCount[p.tournament_id] ?? 0) + 1
    }

    return (tournamentsRes.data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      sport: t.sport,
      status: t.status,
      entry_fee: Number(t.entry_fee) || 0,
      max_participants: t.max_participants,
      participant_count: participantCount[t.id] ?? 0,
      start_date: t.start_date,
      end_date: t.end_date ?? null,
      club_name: (t.clubs as { name?: string } | null)?.name ?? null,
      created_at: t.created_at,
      modality: t.modality ?? null,
    }))
  } catch {
    return []
  }
}

// ============================================================
// Club Requests (admin view)
// ============================================================

export interface ClubRequestAdmin {
  id: string
  user_id: string
  requester_name: string | null
  requester_username: string | null
  name: string
  city: string
  province: string
  description: string | null
  sports: string[]
  contact_phone: string | null
  contact_email: string | null
  status: "pending" | "approved" | "rejected"
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export async function getClubRequestsAdmin(
  status?: "pending" | "approved" | "rejected"
): Promise<ClubRequestAdmin[]> {
  try {
    const supabase = createServiceClient()

    let query = supabase
      .from("club_requests")
      .select(
        "id, user_id, name, city, province, description, sports, contact_phone, contact_email, status, admin_notes, reviewed_by, reviewed_at, created_at, updated_at, profiles!club_requests_user_id_fkey(full_name, username)"
      )
      .order("created_at", { ascending: false })
      .limit(200)

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return (data ?? []).map((row) => {
      const profile = row.profiles as { full_name?: string | null; username?: string | null } | null
      return {
        id: row.id,
        user_id: row.user_id,
        requester_name: profile?.full_name ?? null,
        requester_username: profile?.username ?? null,
        name: row.name,
        city: row.city,
        province: row.province,
        description: row.description ?? null,
        sports: row.sports ?? [],
        contact_phone: row.contact_phone ?? null,
        contact_email: row.contact_email ?? null,
        status: row.status as ClubRequestAdmin["status"],
        admin_notes: row.admin_notes ?? null,
        reviewed_by: row.reviewed_by ?? null,
        reviewed_at: row.reviewed_at ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    })
  } catch {
    return []
  }
}

// ---- getAdminModerationData ----------------------------------------

export async function getAdminModerationData(): Promise<AdminModerationData> {
  const EMPTY: AdminModerationData = { pendingClubs: [], recentUsers: [], inactiveClubs: [] }

  try {
    const supabase = createServiceClient()

    const [inactiveClubsRes, recentUsersRes, ownersRes] = await Promise.all([
      supabase
        .from("clubs")
        .select("id, name, city, province, created_at")
        .eq("is_active", false)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("profiles")
        .select("id, full_name, username, global_role, created_at, city")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("club_members")
        .select("club_id, user_id, profiles(full_name)")
        .eq("role", "owner")
        .eq("is_active", true),
    ])

    const ownerByClub: Record<string, string | null> = {}
    for (const o of ownersRes.data ?? []) {
      ownerByClub[o.club_id] = (o.profiles as { full_name?: string | null } | null)?.full_name ?? null
    }

    const inactiveClubs = inactiveClubsRes.data ?? []

    const pendingClubs = inactiveClubs.map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      province: c.province,
      created_at: c.created_at,
      owner_name: ownerByClub[c.id] ?? null,
    }))

    const inactiveClubsShort = inactiveClubs.slice(0, 10).map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      created_at: c.created_at,
    }))

    const recentUsers = (recentUsersRes.data ?? []).map((u) => ({
      id: u.id,
      full_name: u.full_name,
      username: u.username ?? null,
      global_role: u.global_role,
      created_at: u.created_at,
      city: u.city,
    }))

    return { pendingClubs, recentUsers, inactiveClubs: inactiveClubsShort }
  } catch {
    return EMPTY
  }
}

// ============================================================
// Control Tower — consolidated data for admin home dashboard
// ============================================================

export interface ControlTowerKPIs {
  totalUsers: number
  activePlayersThisWeek: number
  totalClubs: number
  activeMatchesToday: number
  totalRevenue: number
  revenueThisMonth: number
  revenueLastMonth: number
  newUsersThisMonth: number
  totalTournaments: number
  // WoW (week-over-week) comparisons
  usersThisWeek: number
  usersLastWeek: number
  matchesThisWeek: number
  matchesLastWeek: number
  revenueThisWeek: number
  revenueLastWeek: number
  // Extra KPIs
  conversionRate: number      // % of users with ≥1 reservation
  pipelineNext7Days: number   // confirmed reservations in next 7 days
}

export type AlertSeverity = "critical" | "warn" | "info"

export interface SmartAlert {
  id: string
  severity: AlertSeverity
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
}

export interface ActivityFeedEntry {
  id: string
  action: string
  entity_type: string | null
  details: Record<string, unknown>
  created_at: string
}

export interface SystemHealthData {
  suspendedUsers: number
  pendingClubRequests: number
  cancelledReservationsToday: number
  inactiveClubs: number
}

export interface ControlTowerRanking {
  id: string
  name: string
  value: number
  secondary?: string
}

export interface ControlTowerData {
  kpis: ControlTowerKPIs
  activityFeed: ActivityFeedEntry[]
  growthData: {
    usersByMonth: Array<{ month: string; users: number; prevUsers: number }>
    matchesByMonth: Array<{ month: string; matches: number; prevMatches: number }>
    revenueByMonth: Array<{ month: string; revenue: number; prevRevenue: number }>
  }
  systemHealth: SystemHealthData
  alerts: SmartAlert[]
  topClubs: ControlTowerRanking[]
  topPlayers: ControlTowerRanking[]
  topTournaments: ControlTowerRanking[]
  revenue: {
    total: number
    thisMonth: number
    lastMonth: number
    avgPerMatch: number
    tournamentRevenue: number
    topClubsByRevenue: Array<{ id: string; name: string; revenue: number; matches: number }>
  }
}

export async function getAdminControlTowerData(): Promise<ControlTowerData> {
  const supabase = createServiceClient()

  const now = new Date()
  const todayStr = now.toISOString().split("T")[0]
  const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const firstLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
  const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(now.getDate() - 14)
  const next7Days = new Date(now); next7Days.setDate(now.getDate() + 7)
  const monthStart6 = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [
    usersCountRes,
    clubsCountRes,
    tournamentsCountRes,
    activeMatchesRes,
    newUsersMonthRes,
    revenueReservationsRes,
    tournamentRevenueRes,
    activityFeedRes,
    suspendedUsersRes,
    pendingClubRequestsRes,
    cancelledTodayRes,
    inactiveClubsCountRes,
    topPlayersRes,
    topTournamentsRes,
    clubsNamesRes,
    sixMonthUsersRes,
    sixMonthReservationsRes,
    // WoW + extra KPI queries
    twoWeekUsersRes,
    twoWeekReservationsRes,
    pipelineRes,
    usersWithReservationsRes,
    // Smart alert queries
    openTournamentsRes,
    pendingOldRequestsRes,
    clubsWithRecentReservationsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("clubs").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("tournaments").select("id", { count: "exact", head: true }),
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("date", todayStr)
      .eq("status", "confirmed"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", firstThisMonth),
    supabase
      .from("reservations")
      .select("created_at, total_price, club_id")
      .neq("status", "cancelled"),
    supabase
      .from("tournament_participants")
      .select("tournament_id, tournaments(entry_fee)")
      .eq("payment_status", "paid"),
    supabase
      .from("audit_log")
      .select("id, action, entity_type, details, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("settings->suspended_from_role", "is", null),
    supabase
      .from("club_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("status", "cancelled")
      .gte("updated_at", `${todayStr}T00:00:00`),
    supabase
      .from("clubs")
      .select("id", { count: "exact", head: true })
      .eq("is_active", false),
    supabase
      .from("profiles")
      .select("id, full_name, username, matches_played, rating")
      .order("matches_played", { ascending: false })
      .limit(5),
    supabase
      .from("tournaments")
      .select("id, name, sport")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("clubs").select("id, name"),
    supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", monthStart6.toISOString()),
    supabase
      .from("reservations")
      .select("created_at, total_price, club_id")
      .gte("created_at", monthStart6.toISOString())
      .neq("status", "cancelled"),
    // Last 2 weeks of user registrations (for WoW)
    supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", twoWeeksAgo.toISOString()),
    // Last 2 weeks of reservations (for WoW revenue + match count)
    supabase
      .from("reservations")
      .select("created_at, total_price")
      .gte("created_at", twoWeeksAgo.toISOString())
      .neq("status", "cancelled"),
    // Pipeline: confirmed reservations in next 7 days
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed")
      .gte("date", todayStr)
      .lte("date", next7Days.toISOString().split("T")[0]),
    // Distinct users who have made ≥1 reservation (for conversion rate)
    supabase
      .from("reservations")
      .select("user_id")
      .neq("status", "cancelled"),
    // Open tournaments for alert analysis
    supabase
      .from("tournaments")
      .select("id, name, max_participants")
      .eq("status", "open"),
    // Pending club requests older than 3 days
    supabase
      .from("club_requests")
      .select("id, club_name, created_at")
      .eq("status", "pending")
      .lte("created_at", new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()),
    // Clubs with a reservation in the last 7 days (to find clubs without activity)
    supabase
      .from("reservations")
      .select("club_id")
      .gte("created_at", weekAgo.toISOString())
      .neq("status", "cancelled"),
  ])

  // ---- Revenue calculations
  const reservationRows = revenueReservationsRes.data ?? []
  const totalRevenue = reservationRows.reduce((s, r) => s + (Number(r.total_price) || 0), 0)
  const revenueThisMonth = reservationRows
    .filter((r) => new Date(r.created_at) >= new Date(firstThisMonth))
    .reduce((s, r) => s + (Number(r.total_price) || 0), 0)
  const revenueLastMonth = reservationRows
    .filter((r) => {
      const d = new Date(r.created_at)
      return d >= new Date(firstLastMonth) && d < new Date(firstThisMonth)
    })
    .reduce((s, r) => s + (Number(r.total_price) || 0), 0)
  const tournamentRevenue = (tournamentRevenueRes.data ?? []).reduce((s, p) => {
    const fee = Number((p.tournaments as { entry_fee?: number } | null)?.entry_fee ?? 0)
    return s + fee
  }, 0)

  const activePlayersThisWeek = (sixMonthUsersRes.data ?? []).filter(
    (u) => new Date(u.created_at) >= weekAgo
  ).length

  // ---- WoW calculations
  const twoWeekUsers = twoWeekUsersRes.data ?? []
  const usersThisWeek = twoWeekUsers.filter((u) => new Date(u.created_at) >= weekAgo).length
  const usersLastWeek = twoWeekUsers.filter((u) => {
    const d = new Date(u.created_at)
    return d >= twoWeeksAgo && d < weekAgo
  }).length

  const twoWeekRes = twoWeekReservationsRes.data ?? []
  const matchesThisWeek = twoWeekRes.filter((r) => new Date(r.created_at) >= weekAgo).length
  const matchesLastWeek = twoWeekRes.filter((r) => {
    const d = new Date(r.created_at)
    return d >= twoWeeksAgo && d < weekAgo
  }).length
  const revenueThisWeek = twoWeekRes
    .filter((r) => new Date(r.created_at) >= weekAgo)
    .reduce((s, r) => s + (Number(r.total_price) || 0), 0)
  const revenueLastWeek = twoWeekRes
    .filter((r) => {
      const d = new Date(r.created_at)
      return d >= twoWeeksAgo && d < weekAgo
    })
    .reduce((s, r) => s + (Number(r.total_price) || 0), 0)

  // ---- Conversion rate: % of users with ≥1 reservation
  const usersWithReservations = usersWithReservationsRes.data ?? []
  const distinctUsersWithRes = new Set(usersWithReservations.map((r) => r.user_id)).size
  const totalUserCount = usersCountRes.count ?? 0
  const conversionRate = totalUserCount > 0
    ? Math.round((distinctUsersWithRes / totalUserCount) * 100)
    : 0

  const kpis: ControlTowerKPIs = {
    totalUsers: totalUserCount,
    activePlayersThisWeek,
    totalClubs: clubsCountRes.count ?? 0,
    activeMatchesToday: activeMatchesRes.count ?? 0,
    totalRevenue,
    revenueThisMonth,
    revenueLastMonth,
    newUsersThisMonth: newUsersMonthRes.count ?? 0,
    totalTournaments: tournamentsCountRes.count ?? 0,
    usersThisWeek,
    usersLastWeek,
    matchesThisWeek,
    matchesLastWeek,
    revenueThisWeek,
    revenueLastWeek,
    conversionRate,
    pipelineNext7Days: pipelineRes.count ?? 0,
  }

  // ---- Smart Alerts
  const alerts: SmartAlert[] = []

  // Alert: open tournaments with <25% capacity filled
  const openTournaments = openTournamentsRes.data ?? []
  if (openTournaments.length > 0) {
    const participantCountsByTournament = await supabase
      .from("tournament_participants")
      .select("tournament_id")
      .in("tournament_id", openTournaments.map((t) => t.id))
    const pCounts: Record<string, number> = {}
    for (const p of participantCountsByTournament.data ?? []) {
      pCounts[p.tournament_id] = (pCounts[p.tournament_id] ?? 0) + 1
    }
    for (const t of openTournaments) {
      const count = pCounts[t.id] ?? 0
      const max = t.max_participants ?? 16
      if (count < max * 0.25) {
        alerts.push({
          id: `tournament-low-${t.id}`,
          severity: "warn",
          title: `Torneo con baja inscripción`,
          description: `"${t.name}" tiene solo ${count}/${max} inscripciones (${Math.round((count / max) * 100)}% del cupo).`,
          actionHref: "/admin/tournaments",
          actionLabel: "Ver torneos",
        })
      }
    }
  }

  // Alert: pending club requests older than 3 days
  const oldRequests = pendingOldRequestsRes.data ?? []
  if (oldRequests.length > 0) {
    alerts.push({
      id: "old-club-requests",
      severity: "warn",
      title: `${oldRequests.length} solicitud${oldRequests.length > 1 ? "es" : ""} pendiente${oldRequests.length > 1 ? "s" : ""} +3 días`,
      description: `Hay solicitudes de club sin revisar hace más de 3 días.`,
      actionHref: "/admin/moderation",
      actionLabel: "Revisar",
    })
  }

  // Alert: revenue drop >20% WoW
  if (revenueLastWeek > 0) {
    const revDrop = ((revenueThisWeek - revenueLastWeek) / revenueLastWeek) * 100
    if (revDrop < -20) {
      alerts.push({
        id: "revenue-drop",
        severity: "critical",
        title: `Revenue semanal cayó ${Math.abs(Math.round(revDrop))}%`,
        description: `Esta semana: $${revenueThisWeek.toFixed(0)} vs semana pasada: $${revenueLastWeek.toFixed(0)}.`,
        actionHref: "/admin/financials",
        actionLabel: "Ver financiero",
      })
    }
  }

  // Alert: clubs with no reservations in last 7 days
  const activeClubIds = new Set((clubsWithRecentReservationsRes.data ?? []).map((r) => r.club_id))
  const inactiveClubCount = Math.max(0, (clubsCountRes.count ?? 0) - activeClubIds.size)
  if (inactiveClubCount > 0) {
    alerts.push({
      id: "clubs-no-activity",
      severity: "info",
      title: `${inactiveClubCount} club${inactiveClubCount > 1 ? "s" : ""} sin reservas esta semana`,
      description: `Estos clubs activos no han tenido reservas en los últimos 7 días.`,
      actionHref: "/admin/clubs",
      actionLabel: "Ver clubs",
    })
  }

  // Alert: unusual cancellations (>5 today)
  const cancelledToday = cancelledTodayRes.count ?? 0
  if (cancelledToday > 5) {
    alerts.push({
      id: "high-cancellations",
      severity: "critical",
      title: `${cancelledToday} cancelaciones hoy`,
      description: `Número de cancelaciones inusualmente alto para un solo día.`,
      actionHref: "/admin/reservations",
      actionLabel: "Ver reservas",
    })
  }

  // ---- Activity feed
  const activityFeed: ActivityFeedEntry[] = (activityFeedRes.data ?? []).map((row) => ({
    id: row.id as string,
    action: row.action as string,
    entity_type: row.entity_type as string | null,
    details: (row.details ?? {}) as Record<string, unknown>,
    created_at: row.created_at as string,
  }))

  // ---- Growth charts (6 months)
  function ctMonthLabel(d: Date) {
    return d.toLocaleDateString("es-EC", { month: "short", year: "2-digit" })
  }
  const months6 = Array.from({ length: 6 }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
  )
  const userRows6 = sixMonthUsersRes.data ?? []
  const resRows6 = sixMonthReservationsRes.data ?? []

  const usersByMonth = months6.map((m, i) => {
    const next = new Date(m.getFullYear(), m.getMonth() + 1, 1)
    const users = userRows6.filter((u) => {
      const d = new Date(u.created_at); return d >= m && d < next
    }).length
    // prevUsers = same month 1 year ago (use position i-1 as proxy when no year-ago data)
    const prevMonth = months6[i - 1]
    const prevNext = prevMonth ? new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 1) : null
    const prevUsers = prevMonth && prevNext
      ? userRows6.filter((u) => { const d = new Date(u.created_at); return d >= prevMonth && d < prevNext }).length
      : 0
    return { month: ctMonthLabel(m), users, prevUsers }
  })
  const matchesByMonth = months6.map((m, i) => {
    const next = new Date(m.getFullYear(), m.getMonth() + 1, 1)
    const matches = resRows6.filter((r) => {
      const d = new Date(r.created_at); return d >= m && d < next
    }).length
    const prevMonth = months6[i - 1]
    const prevNext = prevMonth ? new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 1) : null
    const prevMatches = prevMonth && prevNext
      ? resRows6.filter((r) => { const d = new Date(r.created_at); return d >= prevMonth && d < prevNext }).length
      : 0
    return { month: ctMonthLabel(m), matches, prevMatches }
  })
  const revenueByMonth = months6.map((m, i) => {
    const next = new Date(m.getFullYear(), m.getMonth() + 1, 1)
    const revenue = resRows6
      .filter((r) => { const d = new Date(r.created_at); return d >= m && d < next })
      .reduce((s, r) => s + (Number(r.total_price) || 0), 0)
    const prevMonth = months6[i - 1]
    const prevNext = prevMonth ? new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 1) : null
    const prevRevenue = prevMonth && prevNext
      ? resRows6.filter((r) => { const d = new Date(r.created_at); return d >= prevMonth && d < prevNext })
          .reduce((s, r) => s + (Number(r.total_price) || 0), 0)
      : 0
    return { month: ctMonthLabel(m), revenue, prevRevenue }
  })

  // ---- System health
  const systemHealth: SystemHealthData = {
    suspendedUsers: suspendedUsersRes.count ?? 0,
    pendingClubRequests: pendingClubRequestsRes.count ?? 0,
    cancelledReservationsToday: cancelledTodayRes.count ?? 0,
    inactiveClubs: inactiveClubsCountRes.count ?? 0,
  }

  // ---- Top rankings
  const clubsById: Record<string, string> = {}
  for (const c of clubsNamesRes.data ?? []) clubsById[c.id] = c.name
  const clubRevMap: Record<string, { revenue: number; matches: number }> = {}
  for (const r of reservationRows) {
    if (!r.club_id) continue
    const cur = clubRevMap[r.club_id] ?? { revenue: 0, matches: 0 }
    clubRevMap[r.club_id] = {
      revenue: cur.revenue + (Number(r.total_price) || 0),
      matches: cur.matches + 1,
    }
  }
  const topClubs: ControlTowerRanking[] = Object.entries(clubRevMap)
    .map(([id, v]) => ({ id, name: clubsById[id] ?? id, value: v.matches, secondary: `$${v.revenue.toFixed(0)}` }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  const topPlayers: ControlTowerRanking[] = (topPlayersRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.full_name ?? p.username ?? "—",
    value: p.matches_played ?? 0,
    secondary: p.rating ? `★ ${Number(p.rating).toFixed(1)}` : undefined,
  }))

  // Participant counts per tournament
  const participantCountRes = await supabase
    .from("tournament_participants")
    .select("tournament_id")
  const participantCount: Record<string, number> = {}
  for (const p of participantCountRes.data ?? []) {
    participantCount[p.tournament_id] = (participantCount[p.tournament_id] ?? 0) + 1
  }
  const topTournaments: ControlTowerRanking[] = (topTournamentsRes.data ?? [])
    .map((t) => ({ id: t.id, name: t.name, value: participantCount[t.id] ?? 0, secondary: t.sport }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  // ---- Revenue breakdown
  const topClubsByRevenue = Object.entries(clubRevMap)
    .map(([id, v]) => ({ id, name: clubsById[id] ?? id, revenue: v.revenue, matches: v.matches }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
  const avgPerMatch = reservationRows.length > 0 ? totalRevenue / reservationRows.length : 0

  return {
    kpis,
    activityFeed,
    growthData: { usersByMonth, matchesByMonth, revenueByMonth },
    systemHealth,
    alerts,
    topClubs,
    topPlayers,
    topTournaments,
    revenue: {
      total: totalRevenue,
      thisMonth: revenueThisMonth,
      lastMonth: revenueLastMonth,
      avgPerMatch,
      tournamentRevenue,
      topClubsByRevenue,
    },
  }
}
