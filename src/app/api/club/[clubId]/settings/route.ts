import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"
import type { Club } from "@/types"

const updateSettingsSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  province: z.string().max(100).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  logo_url: z.string().url("URL de logo inválida").nullable().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
): Promise<NextResponse<ApiResponse<Club>>> {
  const { clubId } = await params

  const authResult = await authorize({ clubId, requiredPermission: "club.view" })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  try {
    const service = await createServiceClient()
    const { data, error } = await service
      .from("clubs")
      .select("*")
      .eq("id", clubId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, data: null, error: "Club no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: data as Club, error: null })
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener el club" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
): Promise<NextResponse<ApiResponse<Club>>> {
  const { clubId } = await params

  const authResult = await authorize({ clubId, requiredPermission: "config.edit" })
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

  const parsed = updateSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  try {
    const service = await createServiceClient()
    const { data, error } = await service
      .from("clubs")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", clubId)
      .select("*")
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, data: null, error: "Error al actualizar el club" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: data as Club, error: null })
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Error al actualizar el club" },
      { status: 500 }
    )
  }
}
