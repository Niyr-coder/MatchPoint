import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"
import type { Club } from "@/types"
import { ok, fail } from "@/lib/api/response"

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
    return fail("No autorizado", 403)
  }

  try {
    const service = createServiceClient()
    const { data, error } = await service
      .from("clubs")
      .select("*")
      .eq("id", clubId)
      .single()

    if (error || !data) {
      return fail("Club no encontrado", 404)
    }

    return ok(data as Club)
  } catch {
    return fail("Error al obtener el club", 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
): Promise<NextResponse<ApiResponse<Club>>> {
  const { clubId } = await params

  const authResult = await authorize({ clubId, requiredPermission: "config.edit" })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Cuerpo de solicitud inválido")
  }

  const parsed = updateSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  try {
    const service = createServiceClient()
    const { data, error } = await service
      .from("clubs")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", clubId)
      .select("*")
      .single()

    if (error || !data) {
      return fail("Error al actualizar el club", 500)
    }

    return ok(data as Club)
  } catch {
    return fail("Error al actualizar el club", 500)
  }
}
