import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import type { ApiResponse } from "@/types"
import { ok, fail } from "@/lib/api/response"

type RouteContext = { params: Promise<{ id: string }> }

const CLUB_ROLES = ["owner", "manager", "partner", "coach", "employee"] as const
type ClubRole = (typeof CLUB_ROLES)[number]

const postSchema = z.object({
  clubId: z.string().uuid({ message: "ID de club inválido" }),
  role: z.enum(CLUB_ROLES, {
    message: "Rol inválido. Use: owner, manager, partner, coach, employee",
  }),
})

const deleteSchema = z.object({
  clubId: z.string().uuid({ message: "ID de club inválido" }),
})

export async function POST(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<null>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  const ctx = authResult.context
  const rl = await checkRateLimit("adminBulk", ctx.userId, RATE_LIMITS.adminBulk)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta más tarde.", 429)
  }

  const { id } = await params
  if (!id) {
    return fail("ID de usuario requerido")
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Cuerpo de solicitud inválido")
  }

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  const { clubId, role } = parsed.data as { clubId: string; role: ClubRole }

  try {
    const supabase = createServiceClient()

    // Verify the user exists
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", id)
      .maybeSingle()

    if (profileError) throw new Error(profileError.message)
    if (!profile) {
      return fail("Usuario no encontrado", 404)
    }

    // Verify the club exists
    const { data: club, error: clubError } = await supabase
      .from("clubs")
      .select("id")
      .eq("id", clubId)
      .maybeSingle()

    if (clubError) throw new Error(clubError.message)
    if (!club) {
      return fail("Club no encontrado", 404)
    }

    // Deactivate any existing membership for this user+club (role may differ)
    await supabase
      .from("club_members")
      .update({ is_active: false })
      .eq("user_id", id)
      .eq("club_id", clubId)

    // Insert new active membership
    const { error: insertError } = await supabase
      .from("club_members")
      .insert({
        user_id: id,
        club_id: clubId,
        role,
        is_active: true,
        joined_at: new Date().toISOString(),
      })

    if (insertError) throw new Error(insertError.message)

    return ok(null)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[POST /api/admin/users/${id}/memberships]`, message)
    return fail("Error al agregar la membresía", 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<null>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  const { id } = await params
  if (!id) {
    return fail("ID de usuario requerido")
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Cuerpo de solicitud inválido")
  }

  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  const { clubId } = parsed.data

  try {
    const supabase = createServiceClient()

    const { error } = await supabase
      .from("club_members")
      .update({ is_active: false })
      .eq("user_id", id)
      .eq("club_id", clubId)

    if (error) throw new Error(error.message)

    return ok(null)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[DELETE /api/admin/users/${id}/memberships]`, message)
    return fail("Error al eliminar la membresía", 500)
  }
}
