export interface SportCategory {
  id: string
  name: string
  emoji: string
  description: string
  players: string
  gradient: string
  image: string
}

export interface Feature {
  icon: string
  title: string
  description: string
}

export interface Stat {
  value: number
  suffix: string
  label: string
}

export interface NavLink {
  label: string
  href: string
}

export interface FooterColumn {
  title: string
  links: { label: string; href: string }[]
}

export interface WaitlistEntry {
  email: string
  source?: string
}

export interface ApiResponse<T = null> {
  success: boolean
  data: T | null
  error: string | null
}

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  first_name: string | null
  last_name: string | null
  city: string | null
  province: string | null
  phone: string | null
  date_of_birth: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
  // Extended fields added by migrations 005 and 009
  username?: string | null
  global_role?: AppRole
  rating?: number | string | null
  ranking_position?: number | null
  matches_played?: number | null
  matches_won?: number | null
  current_streak?: number | null
  // Added by migration 023_profile_settings
  settings?: Record<string, unknown> | null
}

// ============================================================
// Auth & Roles
// ============================================================

export type AppRole =
  | 'admin'
  | 'owner'
  | 'partner'
  | 'manager'
  | 'employee'
  | 'coach'
  | 'user'

export type AppPermission =
  | 'platform.manage'
  | 'platform.view_analytics'
  | 'club.create'
  | 'club.edit'
  | 'club.delete'
  | 'club.view'
  | 'club.suspend'
  | 'users.create'
  | 'users.edit'
  | 'users.view'
  | 'users.suspend'
  | 'team.manage'
  | 'coaches.create'
  | 'coaches.manage'
  | 'courts.create'
  | 'courts.edit'
  | 'courts.view'
  | 'schedules.manage'
  | 'reservations.create'
  | 'reservations.cancel'
  | 'reservations.view'
  | 'reservations.checkin'
  | 'finance.view_full'
  | 'finance.view_limited'
  | 'finance.cashier'
  | 'finance.export'
  | 'tournaments.create'
  | 'tournaments.manage'
  | 'tournaments.view'
  | 'reports.view_full'
  | 'reports.view_limited'
  | 'reports.create_daily'
  | 'config.edit'
  | 'leaderboard.view'
  | 'shop.purchase'
  | 'reviews.create'
  | 'chat.use'

export interface ClubMember {
  id: string
  user_id: string
  club_id: string
  role: AppRole
  is_active: boolean
  joined_at: string
  updated_at: string
}

export interface Club {
  id: string
  name: string
  slug: string
  description: string | null
  address: string | null
  city: string | null
  province: string | null
  phone: string | null
  logo_url: string | null
  cover_url: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

/** Resolved authorization context for a user in a specific club (or global) */
export interface AuthContext {
  userId: string
  profile: Profile
  globalRole: AppRole
  /** null when accessing platform-level (admin) routes */
  clubId: string | null
  /** role in the current club context */
  clubRole: AppRole | null
  permissions: AppPermission[]
}

export interface OnboardingInput {
  first_name: string
  last_name: string
  city: string
  province: string
  phone: string
  date_of_birth: string
}

// ============================================================
// Navigation & Dashboard
// ============================================================

export interface NavItem {
  label: string
  href: string
  icon: string
  permission?: AppPermission
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

export interface RoleContext {
  clubId: string | null
  clubRole: AppRole
  clubName: string | null
  clubLogo: string | null
}

export interface UserRoleEntry {
  clubId: string
  clubName: string
  clubSlug: string
  clubLogo: string | null
  role: AppRole
}

// ============================================================
// Club Requests (migration 025)
// ============================================================

export type ClubRequestStatus = 'pending' | 'approved' | 'rejected'

export interface ClubRequest {
  id: string
  user_id: string
  name: string
  city: string
  province: string
  description: string | null
  sports: string[]
  contact_phone: string | null
  contact_email: string | null
  status: ClubRequestStatus
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// Notifications (migration 026)
// ============================================================

export type NotificationType =
  | 'club_request_approved'
  | 'club_request_rejected'
  | 'team_invite'
  | 'system'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  metadata: Record<string, unknown>
  created_at: string
}

// ============================================================
// Teams (migration 026)
// ============================================================

export type TeamRole = 'captain' | 'member'

export interface Team {
  id: string
  name: string
  description: string | null
  sport: 'futbol' | 'padel' | 'tenis' | 'pickleball' | null
  club_id: string | null
  created_by: string
  invite_code: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: TeamRole
  joined_at: string
}
