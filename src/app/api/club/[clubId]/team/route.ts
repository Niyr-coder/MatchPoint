import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import {
  getClubTeam,
  addTeamMemberByUserId,
  updateMemberRole,
  deactivateMember,
} from "@/features/clubs/queries/team"
import type { ApiResponse } from "@/types"
import type { TeamMember } from "@/features/clubs/queries/team"
import { ok, fail } from "@/lib/api/response"

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
    return fail("No autorizado", 403)
  }

  try {
    const members = await getClubTeam(clubId)
    return ok(members)
  } catch {
    return fail("Error al obtener el equipo", 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  const { clubId } = await params

  const authResult = await authorize({ clubId, requiredPermission: "team.manage" })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Cuerpo de solicitud inválido")
  }

  const parsed = addMemberSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  const result = await addTeamMemberByUserId(clubId, parsed.data.userId, parsed.data.role)
  if (result.error) {
    const status = result.error === "user_not_found" ? 404 : 500
    return fail(result.error)
  }

  return ok(null, 201)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  const { clubId } = await params

  const authResult = await authorize({ clubId, requiredPermission: "team.manage" })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Cuerpo de solicitud inválido")
  }

  const parsed = patchMemberSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  // Verify the member belongs to this club before modifying
  const service = createServiceClient()
  const { data: member } = await service
    .from("club_members")
    .select("id")
    .eq("id", parsed.data.memberId)
    .eq("club_id", clubId)
    .maybeSingle()

  if (!member) {
    return fail("Miembro no encontrado en este club", 404)
  }

  try {
    if (parsed.data.action === "role") {
      await updateMemberRole(parsed.data.memberId, parsed.data.role)
    } else {
      await deactivateMember(parsed.data.memberId)
    }
    return ok(null)
  } catch {
    return fail("Error al actualizar el miembro", 500)
  }
}
