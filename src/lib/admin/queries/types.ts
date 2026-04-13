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

export interface RecentSignup {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  is_verified: boolean
  account_origin: string | null
  created_at: string
}

export interface PendingClubRequest {
  id: string
  name: string
  city: string
  sports: string[]
  created_at: string
  user_id: string
}

export interface ActiveTournament {
  id: string
  name: string
  sport: string
  status: string
  enrolled: number
  capacity: number
  startDate: string | null
  clubName: string | null
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
  maintenanceMode: boolean
  recentSignups: RecentSignup[]
  pendingRequests: PendingClubRequest[]
  activeTournaments: ActiveTournament[]
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
