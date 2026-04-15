import type { AuthContext } from "@/features/auth/types"
import { getUserRoles } from "@/features/memberships/queries"

const ORGANIZER_ROLES = ['owner', 'manager', 'coach'] as const

/** True if user has the organizador_verificado badge in any club */
function hasBadge(ctx: AuthContext): boolean {
  return ctx.badges.some((b) => b.badge_type === 'organizador_verificado')
}

/** True if user has OWNER, MANAGER, or COACH role in any active club membership */
async function hasOrganizerRole(userId: string): Promise<boolean> {
  const roles = await getUserRoles(userId)
  return roles.some((r) => (ORGANIZER_ROLES as readonly string[]).includes(r.role))
}

/** Check if the authenticated user can create and manage quedadas */
export async function canOrganize(ctx: AuthContext): Promise<boolean> {
  if (hasBadge(ctx)) return true
  return hasOrganizerRole(ctx.userId)
}
