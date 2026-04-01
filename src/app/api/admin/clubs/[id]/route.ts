import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/lib/auth/authorization"
import { createServiceClient } from "@/lib/supabase/server"
import type { ApiResponse, Club } from "@/types"

const ECUADOR_PROVINCES = [
  "Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi",
  "El Oro", "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja",
  "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Orellana", "Pastaza",
  "Pichincha", "Santa Elena", "Santo Domingo de los Tsáchilas", "Sucumbíos",
  "Tungurahua", "Zamora Chinchipe",
] as const

type EcuadorProvince = (typeof ECUADOR_PROVINCES)[number]

// All fields are optional — only send the ones you want to update
const updateClubSchema = z
  .object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    city: z.string().min(1, "La ciudad es requerida"),
    province: z.enum(
      ECUADOR_PROVINCES as readonly [EcuadorProvince, ...EcuadorProvince[]],
      { message: "Provincia inválida" }
    ),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
  })
  .partial()

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<Club>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json(
      { success: false, data: null, error: "ID de club requerido" },
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

  const parsed = updateClubSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { success: false, data: null, error: "No se enviaron campos para actualizar" },
      { status: 422 }
    )
  }

  try {
    const supabase = await createServiceClient()

    // Verify the club exists before updating
    const { data: existing, error: fetchError } = await supabase
      .from("clubs")
      .select("id")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) throw new Error(fetchError.message)
    if (!existing) {
      return NextResponse.json(
        { success: false, data: null, error: "Club no encontrado" },
        { status: 404 }
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from("clubs")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (updateError) throw new Error(updateError.message)
    return NextResponse.json({ success: true, data: updated as Club, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[PUT /api/admin/clubs/${id}]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al actualizar el club" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<null>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json(
      { success: false, data: null, error: "ID de club requerido" },
      { status: 400 }
    )
  }

  try {
    const supabase = await createServiceClient()

    // Verify the club exists before deleting
    const { data: existing, error: fetchError } = await supabase
      .from("clubs")
      .select("id")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) throw new Error(fetchError.message)
    if (!existing) {
      return NextResponse.json(
        { success: false, data: null, error: "Club no encontrado" },
        { status: 404 }
      )
    }

    const { error: deleteError } = await supabase
      .from("clubs")
      .delete()
      .eq("id", id)

    if (deleteError) throw new Error(deleteError.message)
    return NextResponse.json({ success: true, data: null, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[DELETE /api/admin/clubs/${id}]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al eliminar el club" },
      { status: 500 }
    )
  }
}
