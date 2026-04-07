import type { Profile } from "@/features/users/types"

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
