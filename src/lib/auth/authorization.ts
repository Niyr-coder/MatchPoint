import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { AppPermission, AppRole, AuthContext, Profile } from "@/types"

// ──────────────────────────────────────────────────────────
// Result type: every layer returns this
// ──────────────────────────────────────────────────────────

type AuthResult =
  | { ok: true; context: AuthContext }
  | { ok: false; reason: string }

// ──────────────────────────────────────────────────────────
// Layer 1 — Is the user authenticated?
// ──────────────────────────────────────────────────────────

async function checkAuthenticated() {
  const client = await createClient()
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) return { ok: false as const, reason: "not_authenticated" }
  return { ok: true as const, user }
}

// ──────────────────────────────────────────────────────────
// Layer 2 — Does the user exist in the profiles table?
// ──────────────────────────────────────────────────────────

async function checkProfileExists(userId: string) {
  const service = await createServiceClient()
  const { data, error } = await service
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle()
  if (error || !data) return { ok: false as const, reason: "profile_not_found" }
  return { ok: true as const, profile: data as Profile }
}

// ──────────────────────────────────────────────────────────
// Layer 3 — Is the user a global admin?
// ──────────────────────────────────────────────────────────

function checkIsAdmin(profile: Profile): boolean {
  return (profile as Profile & { global_role: AppRole }).global_role === "admin"
}

// ──────────────────────────────────────────────────────────
// Layer 4 — Does the user have access to the requested club?
// ──────────────────────────────────────────────────────────

async function checkClubAccess(userId: string, clubId: string) {
  const service = await createServiceClient()
  const { data, error } = await service
    .from("club_members")
    .select("role, is_active")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .eq("is_active", true)
    .maybeSingle()
  if (error || !data) return { ok: false as const, reason: "no_club_access" }
  return { ok: true as const, role: data.role as AppRole }
}

// ──────────────────────────────────────────────────────────
// Layer 5 — Does the user have one of the required roles?
// ──────────────────────────────────────────────────────────

function checkRole(userRole: AppRole, required: AppRole[]): boolean {
  return required.includes(userRole)
}

// ──────────────────────────────────────────────────────────
// Layer 6 — Does the user have the specific permission?
// ──────────────────────────────────────────────────────────

async function loadPermissions(role: AppRole): Promise<AppPermission[]> {
  const service = await createServiceClient()
  const { data } = await service
    .from("role_permissions")
    .select("permission")
    .eq("role", role)
  return (data ?? []).map((r: { permission: AppPermission }) => r.permission)
}

function checkPermission(
  permissions: AppPermission[],
  required: AppPermission
): boolean {
  return permissions.includes(required)
}

// ──────────────────────────────────────────────────────────
// Main: run all 6 layers
// Params:
//   clubId    — required for club-scoped routes; null for admin routes
//   requiredRoles — optional role whitelist (Layer 5)
//   requiredPermission — optional permission check (Layer 6)
// ──────────────────────────────────────────────────────────

export async function authorize({
  clubId = null,
  requiredRoles,
  requiredPermission,
}: {
  clubId?: string | null
  requiredRoles?: AppRole[]
  requiredPermission?: AppPermission
} = {}): Promise<AuthResult> {

  // Layer 1 — authenticated?
  const authCheck = await checkAuthenticated()
  if (!authCheck.ok) return { ok: false, reason: "not_authenticated" }

  // Layer 2 — exists in DB?
  const profileCheck = await checkProfileExists(authCheck.user.id)
  if (!profileCheck.ok) return { ok: false, reason: "profile_not_found" }

  const { profile } = profileCheck
  const profileWithRole = profile as Profile & { global_role: AppRole }
  const globalRole: AppRole = profileWithRole.global_role ?? "user"
  const isAdmin = globalRole === "admin"

  // Layer 3 — if route requires admin, stop here for non-admins
  if (requiredRoles?.includes("admin") && !isAdmin) {
    return { ok: false, reason: "not_admin" }
  }

  // Admin bypasses layers 4-6 (global access)
  if (isAdmin) {
    const permissions = await loadPermissions("admin")
    return {
      ok: true,
      context: {
        userId: authCheck.user.id,
        profile,
        globalRole,
        clubId,
        clubRole: "admin",
        permissions,
      },
    }
  }

  // Layer 4 — club access (only for club-scoped routes)
  let clubRole: AppRole = "user"
  if (clubId) {
    const clubCheck = await checkClubAccess(authCheck.user.id, clubId)
    if (!clubCheck.ok) return { ok: false, reason: "no_club_access" }
    clubRole = clubCheck.role
  }

  const effectiveRole = clubId ? clubRole : globalRole

  // Layer 5 — required roles?
  if (requiredRoles && requiredRoles.length > 0) {
    if (!checkRole(effectiveRole, requiredRoles)) {
      return { ok: false, reason: "insufficient_role" }
    }
  }

  // Layer 6 — specific permission?
  const permissions = await loadPermissions(effectiveRole)
  if (requiredPermission && !checkPermission(permissions, requiredPermission)) {
    return { ok: false, reason: "insufficient_permission" }
  }

  return {
    ok: true,
    context: {
      userId: authCheck.user.id,
      profile,
      globalRole,
      clubId,
      clubRole: clubId ? clubRole : null,
      permissions,
    },
  }
}

// ──────────────────────────────────────────────────────────
// Helper: authorize or redirect (use in Server Components / Route Handlers)
// Returns AuthContext on success, redirects to /login on failure.
// ──────────────────────────────────────────────────────────

export async function authorizeOrRedirect(
  params: Parameters<typeof authorize>[0] = {}
): Promise<AuthContext> {
  const result = await authorize(params)
  if (!result.ok) {
    const { redirect } = await import("next/navigation")
    redirect("/login")
  }
  return (result as Extract<AuthResult, { ok: true }>).context
}
