import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { logAdminAction } from "@/lib/audit/log"
import type { ApiResponse } from "@/types"

interface UserProfile {
  id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  username: string | null
  email: string | null
  avatar_url: string | null
  global_role: string
  city: string | null
  province: string | null
  created_at: string
  updated_at: string
}

interface ClubMembership {
  club_id: string
  club_name: string | null
  role: string
  is_active: boolean
  joined_at: string
}

interface UserDetail {
  profile: UserProfile
  memberships: ClubMembership[]
}

// NOTE: The profiles table has no is_suspended column (as of migration 024).
// Suspend/unsuspend is implemented by toggling global_role between its current
// value and 'user'. The original role is stored in the `settings` JSONB field
// under the key "suspended_from_role" so it can be restored on unsuspend.
const patchSchema = z.object({
  action: z.enum(["suspend", "unsuspend", "delete", "verify"], {
    message: "Acción inválida. Use: suspend, unsuspend, delete, verify",
  }),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<UserDetail>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json(
      { success: false, data: null, error: "ID de usuario requerido" },
      { status: 400 }
    )
  }

  try {
    const supabase = createServiceClient()

    const [profileRes, membershipsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, first_name, last_name, username, avatar_url, global_role, city, province, created_at, updated_at"
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("club_members")
        .select("club_id, role, is_active, joined_at, clubs(name)")
        .eq("user_id", id),
    ])

    if (profileRes.error) throw new Error(profileRes.error.message)
    if (!profileRes.data) {
      return NextResponse.json(
        { success: false, data: null, error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    const profile: UserProfile = {
      ...profileRes.data,
      // email is not stored in profiles — it lives in auth.users (not accessible via service client select)
      email: null,
    }

    const memberships: ClubMembership[] = (membershipsRes.data ?? []).map((m) => ({
      club_id: m.club_id,
      club_name: (m.clubs as { name?: string } | null)?.name ?? null,
      role: m.role,
      is_active: m.is_active,
      joined_at: m.joined_at,
    }))

    return NextResponse.json({
      success: true,
      data: { profile, memberships },
      error: null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[GET /api/admin/users/${id}]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener el usuario" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<null>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json(
      { success: false, data: null, error: "ID de usuario requerido" },
      { status: 400 }
    )
  }

  // Prevent acting on own account
  if (id === authResult.context.userId) {
    return NextResponse.json(
      { success: false, data: null, error: "No puedes aplicar esta acción a tu propia cuenta" },
      { status: 400 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Cuerpo de solicitud inválido" },
      { status: 400 }
    )
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  const { action } = parsed.data

  try {
    const supabase = createServiceClient()

    // Fetch current profile to validate state
    const { data: existing, error: fetchError } = await supabase
      .from("profiles")
      .select("id, global_role, settings")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) throw new Error(fetchError.message)
    if (!existing) {
      return NextResponse.json(
        { success: false, data: null, error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Prevent acting on other admins (except verify)
    if (existing.global_role === "admin" && action !== "unsuspend" && action !== "verify") {
      return NextResponse.json(
        { success: false, data: null, error: "No se puede aplicar esta acción a otro administrador" },
        { status: 400 }
      )
    }

    if (action === "verify") {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          verified_by: authResult.context.userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (updateError) throw new Error(updateError.message)

      await logAdminAction({
        action: "user.verified",
        entityType: "users",
        entityId: id,
        actorId: authResult.context.userId,
      })

      return NextResponse.json({ success: true, data: null, error: null })
    }

    if (action === "delete") {
      // Hard-delete from auth.users — CASCADE will remove the profile row
      const { error: deleteError } = await supabase.auth.admin.deleteUser(id)
      if (deleteError) throw new Error(deleteError.message)

      await logAdminAction({
        action: "user.deleted",
        entityType: "users",
        entityId: id,
        actorId: authResult.context.userId,
      })

      return NextResponse.json({ success: true, data: null, error: null })
    }

    if (action === "suspend") {
      // NOTE: profiles has no is_suspended column. Suspension is modelled as a
      // global_role downgrade to 'user'. The previous role is stored in settings
      // so it can be restored when the account is unsuspended.
      const currentSettings = (existing.settings as Record<string, unknown> | null) ?? {}
      const updatedSettings = {
        ...currentSettings,
        suspended_from_role: existing.global_role,
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          global_role: "user",
          settings: updatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (updateError) throw new Error(updateError.message)

      await logAdminAction({
        action: "user.suspended",
        entityType: "users",
        entityId: id,
        actorId: authResult.context.userId,
        details: { previousRole: existing.global_role },
      })

      return NextResponse.json({ success: true, data: null, error: null })
    }

    if (action === "unsuspend") {
      // Restore the role that was saved at suspension time, fallback to 'user'.
      // Validate against allowed set to prevent privilege escalation via JSONB tampering.
      const RESTORABLE_ROLES = ["owner", "partner", "manager", "employee", "coach", "user"] as const
      type RestorableRole = (typeof RESTORABLE_ROLES)[number]
      const currentSettings = (existing.settings as Record<string, unknown> | null) ?? {}
      const rawRole = currentSettings.suspended_from_role as string | undefined
      const previousRole: RestorableRole = RESTORABLE_ROLES.includes(rawRole as RestorableRole)
        ? (rawRole as RestorableRole)
        : "user"
      const { suspended_from_role: _removed, ...cleanedSettings } = currentSettings

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          global_role: previousRole,
          settings: cleanedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (updateError) throw new Error(updateError.message)

      await logAdminAction({
        action: "user.unsuspended",
        entityType: "users",
        entityId: id,
        actorId: authResult.context.userId,
        details: { restoredRole: previousRole },
      })

      return NextResponse.json({ success: true, data: null, error: null })
    }

    // Exhaustive check — should never reach here
    return NextResponse.json(
      { success: false, data: null, error: "Acción no reconocida" },
      { status: 400 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[PATCH /api/admin/users/${id}]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al procesar la acción sobre el usuario" },
      { status: 500 }
    )
  }
}
