import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/lib/auth/authorization"
import {
  getClubTeam,
  addTeamMemberByUserId,
  updateMemberRole,
  deactivateMember,
} from "@/lib/team/queries"
import type { ApiResponse } from "@/types"
import type { TeamMember } from "@/lib/team/queries"

const VALID_TEAM_ROLES = ["owner", "manager", "employee", "coach"] as const

const addMemberSchema = z.object({
  userId: z.string().uuid("ID de usuario inválido"),
  role: z.enum(VALID_TEAM_ROLES, { message: "Rol inválido" }),
})

const patchMemberSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("role"),
    memberId: z.string().uuid(),
    role: z.enum(VALID_TEAM_ROLES, { message: "Rol inválido" }),
  }),
  z.object({
    action: z.literal("deactivate"),
    memberId: z.string().uuid(),
  }),
])

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
): Promise<NextResponse<ApiResponse<TeamMember[]>>> {
  const { clubId } = await params

  const authResult = await authorize({ clubId, requiredPermission: "team.manage" })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  try {
    const members = await getClubTeam(clubId)
    return NextResponse.json({ success: true, data: members, error: null })
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener el equipo" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  const { clubId } = await params

  const authResult = await authorize({ clubId, requiredPermission: "team.manage" })
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

  const parsed = addMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  const result = await addTeamMemberByUserId(clubId, parsed.data.userId, parsed.data.role)
  if (result.error) {
    const status = result.error === "user_not_found" ? 404 : 500
    return NextResponse.json(
      { success: false, data: null, error: result.error },
      { status }
    )
  }

  return NextResponse.json({ success: true, data: null, error: null }, { status: 201 })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  const { clubId } = await params

  const authResult = await authorize({ clubId, requiredPermission: "team.manage" })
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

  const parsed = patchMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  try {
    if (parsed.data.action === "role") {
      await updateMemberRole(parsed.data.memberId, parsed.data.role)
    } else {
      await deactivateMember(parsed.data.memberId)
    }
    return NextResponse.json({ success: true, data: null, error: null })
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Error al actualizar el miembro" },
      { status: 500 }
    )
  }
}
