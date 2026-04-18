import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { getAllUsersAdmin } from "@/lib/admin/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { logAdminAction } from "@/lib/audit/log"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import type { ApiResponse, AppRole } from "@/types"
import type { UserAdmin } from "@/lib/admin/queries"
import { ok, fail } from "@/lib/api/response"

const VALID_ROLES: AppRole[] = [
  "admin", "owner", "partner", "manager", "employee", "coach", "user",
]

const changeRoleSchema = z.object({
  userId: z.string().uuid("ID de usuario inválido"),
  globalRole: z.enum(
    ["admin", "owner", "partner", "manager", "employee", "coach", "user"],
    "Rol inválido"
  ),
})

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<UserAdmin[]>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  const { searchParams } = request.nextUrl
  const search = searchParams.get("search") ?? undefined
  const role = searchParams.get("role") ?? undefined

  // Validate role filter against known roles
  const validRole =
    role && (VALID_ROLES as string[]).includes(role) ? role : undefined

  try {
    const users = await getAllUsersAdmin({ search, role: validRole })
    return ok(users)
  } catch {
    return fail("Error al obtener los usuarios", 500)
  }
}

export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse<null>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  const ctx = authResult.context
  const rl = await checkRateLimit("adminCreateUser", ctx.userId, RATE_LIMITS.adminCreateUser)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta más tarde.", 429)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Cuerpo de solicitud inválido")
  }

  const parsed = changeRoleSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  try {
    const supabase = createServiceClient()
    const { error } = await supabase
      .from("profiles")
      .update({
        global_role: parsed.data.globalRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.userId)

    if (error) throw new Error(error.message)

    await logAdminAction({
      action: "user.role_changed",
      entityType: "users",
      entityId: parsed.data.userId,
      actorId: authResult.context.userId,
      details: { globalRole: parsed.data.globalRole },
    })

    return ok(null)
  } catch {
    return fail("Error al cambiar el rol", 500)
  }
}
