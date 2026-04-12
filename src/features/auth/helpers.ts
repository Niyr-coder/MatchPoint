import type { SupabaseClient } from "@supabase/supabase-js"
import type { AppRole } from "@/features/auth/types"
import type { Profile } from "@/features/users/types"
import type { UserRoleEntry } from "@/features/memberships/types"

export async function getPostLoginDestination(
  _profile: Profile,
  globalRole: AppRole,
  roles: UserRoleEntry[],
  supabase: SupabaseClient
): Promise<string> {
  if (globalRole === "admin") return "/admin"
  if (roles.length === 0) return "/dashboard"
  if (roles.length === 1) {
    const { role, clubId } = roles[0]
    if (role === "owner") {
      const { count } = await supabase
        .from("courts")
        .select("*", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("is_active", true)
      if ((count ?? 0) === 0) return `/club/${clubId}/owner/setup`
    }
    return `/club/${clubId}/${role}`
  }
  return "/context-selector"
}
