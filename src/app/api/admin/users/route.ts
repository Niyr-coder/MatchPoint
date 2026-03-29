import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/lib/auth/authorization"
import { getAllUsersAdmin } from "@/lib/admin/queries"
import { createServiceClient } from "@/lib/supabase/server"
import type { ApiResponse, AppRole } from "@/types"
import type { UserAdmin } from "@/lib/admin/queries"

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
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  const { searchParams } = request.nextUrl
  const search = searchParams.get("search") ?? undefined
  const role = searchParams.get("role") ?? undefined

  // Validate role filter against known roles
  const validRole =
    role && (VALID_ROLES as string[]).includes(role) ? role : undefined

  try {
    const users = await getAllUsersAdmin({ search, role: validRole })
    return NextResponse.json({ success: true, data: users, error: null })
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener los usuarios" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse<null>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
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

  const parsed = changeRoleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  try {
    const supabase = await createServiceClient()
    const { error } = await supabase
      .from("profiles")
      .update({
        global_role: parsed.data.globalRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.userId)

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, data: null, error: null })
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Error al cambiar el rol" },
      { status: 500 }
    )
  }
}
