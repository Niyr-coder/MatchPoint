import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { logAdminAction } from "@/lib/audit/log"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import type { ApiResponse, Club } from "@/types"
import { ok, fail } from "@/lib/api/response"

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
    description: z.string().nullish(),
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
    return fail("No autorizado", 403)
  }

  const ctx = authResult.context
  const rl = await checkRateLimit("adminBulk", ctx.userId, RATE_LIMITS.adminBulk)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta más tarde.", 429)
  }

  const { id } = await context.params
  if (!id) {
    return fail("ID de club requerido")
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Cuerpo de solicitud inválido")
  }

  const parsed = updateClubSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  if (Object.keys(parsed.data).length === 0) {
    return fail("No se enviaron campos para actualizar", 422)
  }

  try {
    const supabase = createServiceClient()

    // Verify the club exists before updating
    const { data: existing, error: fetchError } = await supabase
      .from("clubs")
      .select("id")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) throw new Error(fetchError.message)
    if (!existing) {
      return fail("Club no encontrado", 404)
    }

    const { data: updated, error: updateError } = await supabase
      .from("clubs")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (updateError) throw new Error(updateError.message)

    await logAdminAction({
      action: "club.updated",
      entityType: "clubs",
      entityId: id,
      actorId: authResult.context.userId,
      details: { fields: Object.keys(parsed.data) },
    })

    return ok(updated as Club)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[PUT /api/admin/clubs/${id}]`, message)
    return fail("Error al actualizar el club", 500)
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
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

  const { id } = await context.params
  if (!id) {
    return fail("ID de club requerido")
  }

  try {
    const supabase = createServiceClient()

    // Verify the club exists before deleting
    const { data: existing, error: fetchError } = await supabase
      .from("clubs")
      .select("id")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) throw new Error(fetchError.message)
    if (!existing) {
      return fail("Club no encontrado", 404)
    }

    const { error: deleteError } = await supabase
      .from("clubs")
      .delete()
      .eq("id", id)

    if (deleteError) throw new Error(deleteError.message)

    await logAdminAction({
      action: "club.deleted",
      entityType: "clubs",
      entityId: id,
      actorId: authResult.context.userId,
    })

    return ok(null)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[DELETE /api/admin/clubs/${id}]`, message)
    return fail("Error al eliminar el club", 500)
  }
}
