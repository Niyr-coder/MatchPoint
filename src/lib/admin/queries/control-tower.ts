import { createServiceClient } from "@/lib/supabase/server"
import type {
  ControlTowerData,
  ControlTowerKPIs,
  ActivityFeedEntry,
  SystemHealthData,
  SmartAlert,
  ControlTowerRanking,
  RecentSignup,
  PendingClubRequest,
  ActiveTournament,
} from "./types"

export async function getAdminControlTowerData(): Promise<ControlTowerData> {
  const supabase = createServiceClient()

  const now = new Date()
  const todayStr = now.toISOString().split("T")[0]
  const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const firstLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
  const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(now.getDate() - 14)
  const next7Days = new Date(now); next7Days.setDate(now.getDate() + 7)
  const monthStart12 = new Date(now.getFullYear(), now.getMonth() - 11, 1)

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
    maintenanceModeRes,
    recentSignupsRes,
    pendingRequestsListRes,
    activeTournamentsRes,
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
      .gte("created_at", monthStart12.toISOString()),
    supabase
      .from("reservations")
      .select("created_at, total_price, club_id")
      .gte("created_at", monthStart12.toISOString())
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
    // Maintenance mode setting
    supabase.from("platform_settings").select("value").eq("key", "maintenance_mode").maybeSingle(),
    // Recent signups (for dashboard panel)
    supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, is_verified, account_origin, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    // Pending club requests list (for dashboard panel)
    supabase
      .from("club_requests")
      .select("id, user_id, name, city, sports, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10),
    // Active tournaments with enrollment counts
    supabase
      .from("tournaments")
      .select("id, name, sport, status, max_participants, start_date, clubs(name), tournament_participants(id)")
      .in("status", ["open", "in_progress"])
      .order("start_date", { ascending: true })
      .limit(10),
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
  const months12 = Array.from({ length: 12 }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
  )
  const userRows12 = sixMonthUsersRes.data ?? []
  const resRows12 = sixMonthReservationsRes.data ?? []

  const usersByMonth = months12.map((m, i) => {
    const next = new Date(m.getFullYear(), m.getMonth() + 1, 1)
    const users = userRows12.filter((u) => {
      const d = new Date(u.created_at); return d >= m && d < next
    }).length
    const prevMonth = months12[i - 1]
    const prevNext = prevMonth ? new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 1) : null
    const prevUsers = prevMonth && prevNext
      ? userRows12.filter((u) => { const d = new Date(u.created_at); return d >= prevMonth && d < prevNext }).length
      : 0
    return { month: ctMonthLabel(m), users, prevUsers }
  })
  const matchesByMonth = months12.map((m, i) => {
    const next = new Date(m.getFullYear(), m.getMonth() + 1, 1)
    const matches = resRows12.filter((r) => {
      const d = new Date(r.created_at); return d >= m && d < next
    }).length
    const prevMonth = months12[i - 1]
    const prevNext = prevMonth ? new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 1) : null
    const prevMatches = prevMonth && prevNext
      ? resRows12.filter((r) => { const d = new Date(r.created_at); return d >= prevMonth && d < prevNext }).length
      : 0
    return { month: ctMonthLabel(m), matches, prevMatches }
  })
  const revenueByMonth = months12.map((m, i) => {
    const next = new Date(m.getFullYear(), m.getMonth() + 1, 1)
    const revenue = resRows12
      .filter((r) => { const d = new Date(r.created_at); return d >= m && d < next })
      .reduce((s, r) => s + (Number(r.total_price) || 0), 0)
    const prevMonth = months12[i - 1]
    const prevNext = prevMonth ? new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 1) : null
    const prevRevenue = prevMonth && prevNext
      ? resRows12.filter((r) => { const d = new Date(r.created_at); return d >= prevMonth && d < prevNext })
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

  // ---- Maintenance mode
  const maintenanceMode = maintenanceModeRes.data?.value === true || maintenanceModeRes.data?.value === "true"

  // ---- Recent signups
  const recentSignups: RecentSignup[] = (recentSignupsRes.data ?? []).map((u) => ({
    id: u.id as string,
    full_name: (u.full_name as string | null) ?? null,
    username: (u.username as string | null) ?? null,
    avatar_url: (u.avatar_url as string | null) ?? null,
    is_verified: Boolean(u.is_verified),
    account_origin: (u.account_origin as string | null) ?? null,
    created_at: u.created_at as string,
  }))

  // ---- Pending requests list
  const pendingRequests: PendingClubRequest[] = (pendingRequestsListRes.data ?? []).map((r) => ({
    id: r.id as string,
    user_id: r.user_id as string,
    name: r.name as string,
    city: r.city as string,
    sports: (r.sports as string[]) ?? [],
    created_at: r.created_at as string,
  }))

  // ---- Active tournaments with enrollment
  const activeTournaments: ActiveTournament[] = (activeTournamentsRes.data ?? []).map((t) => {
    const participants = Array.isArray(t.tournament_participants) ? t.tournament_participants.length : 0
    const clubRaw = t.clubs
    const club = (Array.isArray(clubRaw) ? clubRaw[0] : clubRaw) as { name: string } | null | undefined
    return {
      id: t.id as string,
      name: t.name as string,
      sport: t.sport as string,
      status: t.status as string,
      enrolled: participants,
      capacity: (t.max_participants as number) ?? 0,
      startDate: (t.start_date as string) ?? null,
      clubName: club?.name ?? null,

    }
  })

  return {
    kpis,
    activityFeed,
    growthData: { usersByMonth, matchesByMonth, revenueByMonth },
    systemHealth,
    alerts,
    maintenanceMode,
    recentSignups,
    pendingRequests,
    activeTournaments,
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
