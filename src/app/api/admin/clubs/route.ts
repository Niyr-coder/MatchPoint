import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { getAllClubsAdmin } from "@/lib/admin/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { logAdminAction } from "@/lib/audit/log"
import type { ApiResponse, Club } from "@/types"
import type { ClubAdmin } from "@/lib/admin/queries"

// NOTE: The clubs table has no "sports" column in the DB schema.
// If sports support is added in the future, add a migration first.
const ECUADOR_PROVINCES = [
  "Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi",
  "El Oro", "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja",
  "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Orellana", "Pastaza",
  "Pichincha", "Santa Elena", "Santo Domingo de los Tsáchilas", "Sucumbíos",
  "Tungurahua", "Zamora Chinchipe",
] as const

type EcuadorProvince = (typeof ECUADOR_PROVINCES)[number]

const createClubSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  city: z.string().min(1, "La ciudad es requerida"),
  province: z.enum(ECUADOR_PROVINCES as readonly [EcuadorProvince, ...EcuadorProvince[]], {
    message: "Provincia inválida",
  }),
  description: z.string().nullish(),
})

const toggleClubSchema = z.object({
  clubId: z.string().uuid("ID de club inválido"),
  isActive: z.boolean(),
})

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .concat("-", Date.now().toString(36))
}

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
    const supabase = createServiceClient()
    const { error } = await supabase
      .from("clubs")
      .update({ is_active: parsed.data.isActive, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.clubId)

    if (error) throw new Error(error.message)

    await logAdminAction({
      action: "club.toggled_active",
      entityType: "clubs",
      entityId: parsed.data.clubId,
      actorId: authResult.context.userId,
      details: { isActive: parsed.data.isActive },
    })

    return NextResponse.json({ success: true, data: null, error: null })
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Error al actualizar el club" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Club>>> {
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

  const parsed = createClubSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  try {
    const supabase = createServiceClient()
    const now = new Date().toISOString()
    const slug = generateSlug(parsed.data.name)

    const { data: club, error } = await supabase
      .from("clubs")
      .insert({
        name: parsed.data.name,
        city: parsed.data.city,
        province: parsed.data.province,
        description: parsed.data.description ?? null,
        slug,
        is_active: true,
        created_by: authResult.context.userId,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    await logAdminAction({
      action: "club.created",
      entityType: "clubs",
      entityId: club.id,
      actorId: authResult.context.userId,
      details: { name: parsed.data.name, city: parsed.data.city, province: parsed.data.province },
    })

    return NextResponse.json(
      { success: true, data: club as Club, error: null },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    // Unique constraint on slug means a name collision is extremely rare (slug includes timestamp),
    // but surface the raw error in server logs and a generic message to the client.
    console.error("[POST /api/admin/clubs]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al crear el club" },
      { status: 500 }
    )
  }
}
