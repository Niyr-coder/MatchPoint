import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/lib/auth/authorization"
import { getAllClubsAdmin } from "@/lib/admin/queries"
import { createServiceClient } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"
import type { ClubAdmin } from "@/lib/admin/queries"

const toggleClubSchema = z.object({
  clubId: z.string().uuid("ID de club inválido"),
  isActive: z.boolean(),
})

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ClubAdmin[]>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  const { searchParams } = request.nextUrl
  const search = searchParams.get("search") ?? undefined
  const province = searchParams.get("province") ?? undefined

  try {
    const clubs = await getAllClubsAdmin({ search, province })
    return NextResponse.json({ success: true, data: clubs, error: null })
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener los clubs" },
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

  const parsed = toggleClubSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  try {
    const supabase = await createServiceClient()
    const { error } = await supabase
      .from("clubs")
      .update({ is_active: parsed.data.isActive, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.clubId)

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, data: null, error: null })
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Error al actualizar el club" },
      { status: 500 }
    )
  }
}
