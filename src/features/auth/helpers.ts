import type { AppRole } from "@/features/auth/types"
import type { Profile } from "@/features/users/types"
import type { UserRoleEntry } from "@/features/memberships/types"

export function getPostLoginDestination(
  _profile: Profile,
  globalRole: AppRole,
  roles: UserRoleEntry[]
): string {
  if (globalRole === "admin") return "/admin"
  if (roles.length === 0) return "/dashboard"
  if (roles.length === 1) return `/club/${roles[0].clubId}/${roles[0].role}`
  return "/context-selector"
}
