import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/lib/auth/authorization"
import { createServiceClient } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"

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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Cuerpo de solicitud inválido" },
      { status: 400 }
    )
  }

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  const { clubId, role } = parsed.data as { clubId: string; role: ClubRole }

  try {
    const supabase = await createServiceClient()

    // Verify the user exists
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", id)
      .maybeSingle()

    if (profileError) throw new Error(profileError.message)
    if (!profile) {
      return NextResponse.json(
        { success: false, data: null, error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Verify the club exists
    const { data: club, error: clubError } = await supabase
      .from("clubs")
      .select("id")
      .eq("id", clubId)
      .maybeSingle()

    if (clubError) throw new Error(clubError.message)
    if (!club) {
      return NextResponse.json(
        { success: false, data: null, error: "Club no encontrado" },
        { status: 404 }
      )
    }

    const { error: upsertError } = await supabase
      .from("club_members")
      .upsert(
        {
          user_id: id,
          club_id: clubId,
          role,
          is_active: true,
          joined_at: new Date().toISOString(),
        },
        { onConflict: "user_id,club_id" }
      )

    if (upsertError) throw new Error(upsertError.message)

    return NextResponse.json({ success: true, data: null, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[POST /api/admin/users/${id}/memberships]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al agregar la membresía" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Cuerpo de solicitud inválido" },
      { status: 400 }
    )
  }

  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  const { clubId } = parsed.data

  try {
    const supabase = await createServiceClient()

    const { error } = await supabase
      .from("club_members")
      .update({ is_active: false })
      .eq("user_id", id)
      .eq("club_id", clubId)

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, data: null, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[DELETE /api/admin/users/${id}/memberships]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al eliminar la membresía" },
      { status: 500 }
    )
  }
}
