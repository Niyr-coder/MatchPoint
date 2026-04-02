import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/lib/auth/authorization"
import { createServiceClient } from "@/lib/supabase/server"
import {
  getEventById,
  getUserEventRegistration,
  updateEvent,
  deleteEvent,
} from "@/lib/events/queries"
import type { ApiResponse } from "@/types"
import type { EventWithRegistration } from "@/lib/events/queries"

// ──────────────────────────────────────────────────────────
// Validation schema for event updates
// ──────────────────────────────────────────────────────────

const EVENT_TYPES = [
  "social",
  "clinic",
  "workshop",
  "open_day",
  "exhibition",
  "masterclass",
  "quedada",
  "other",
] as const

const SPORT_TYPES = ["futbol", "padel", "tenis", "pickleball"] as const

const VISIBILITY_TYPES = ["public", "club_only", "invite_only"] as const

const STATUS_TYPES = ["draft", "published", "cancelled", "completed"] as const

const updateEventSchema = z
  .object({
    title: z.string().min(3).max(200),
    description: z.string().max(5000).nullish(),
    sport: z.enum(SPORT_TYPES).nullish(),
    event_type: z.enum(EVENT_TYPES),
    club_id: z.string().uuid().nullish(),
    location: z.string().min(1).max(300),
    city: z.string().min(1).max(100),
    start_date: z.string().datetime(),
    end_date: z.string().datetime().nullish(),
    image_url: z.string().url().nullish(),
    max_capacity: z.number().int().positive().nullish(),
    price: z.number().min(0),
    is_free: z.boolean(),
    visibility: z.enum(VISIBILITY_TYPES),
    registration_deadline: z.string().datetime().nullish(),
    min_participants: z.number().int().positive().nullish(),
    tags: z.array(z.string().max(50)).max(10),
    organizer_name: z.string().max(200).nullish(),
    organizer_contact: z.string().max(200).nullish(),
    status: z.enum(STATUS_TYPES),
    is_featured: z.boolean(),
  })
  .partial()

interface RouteContext {
  params: Promise<{ id: string }>
}

// ──────────────────────────────────────────────────────────
// Permission helpers
// ──────────────────────────────────────────────────────────

async function canEditEvent(
  userId: string,
  globalRole: string,
  createdBy: string | null,
  clubId: string | null
): Promise<boolean> {
  if (globalRole === "admin") return true
  if (createdBy === userId) return true
  if (!clubId) return false

  const supabase = createServiceClient()
  const { data } = await supabase
    .from("club_members")
    .select("role")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .eq("is_active", true)
    .maybeSingle()

  if (!data) return false
  return ["owner", "manager"].includes(data.role as string)
}

// ──────────────────────────────────────────────────────────
// GET /api/events/[id]
// ──────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<EventWithRegistration>>> {
  const { id } = await context.params

  try {
    const event = await getEventById(id)
    if (!event) {
      return NextResponse.json(
        { success: false, data: null, error: "Evento no encontrado" },
        { status: 404 }
      )
    }

    // Attempt to enrich with registration status for authenticated users
    const authResult = await authorize()
    let isRegistered = false
    if (authResult.ok) {
      const reg = await getUserEventRegistration(id, authResult.context.userId)
      isRegistered = reg !== null
    }

    return NextResponse.json({
      success: true,
      data: { ...event, is_registered: isRegistered },
      error: null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[GET /api/events/${id}]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener el evento" },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────
// PUT /api/events/[id]
// ──────────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<EventWithRegistration>>> {
  const authResult = await authorize()
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 401 }
    )
  }

  const { id } = await context.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Cuerpo de solicitud inválido" },
      { status: 400 }
    )
  }

  const parsed = updateEventSchema.safeParse(body)
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
    const existing = await getEventById(id)
    if (!existing) {
      return NextResponse.json(
        { success: false, data: null, error: "Evento no encontrado" },
        { status: 404 }
      )
    }

    const { userId, globalRole } = authResult.context
    const allowed = await canEditEvent(
      userId,
      globalRole,
      existing.created_by,
      existing.club_id
    )
    if (!allowed) {
      return NextResponse.json(
        { success: false, data: null, error: "No tienes permisos para editar este evento" },
        { status: 403 }
      )
    }

    const updated = await updateEvent(id, parsed.data)
    return NextResponse.json({
      success: true,
      data: { ...updated, registration_count: existing.registration_count, is_registered: false },
      error: null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[PUT /api/events/${id}]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al actualizar el evento" },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────
// DELETE /api/events/[id]
// ──────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<null>>> {
  const authResult = await authorize()
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 401 }
    )
  }

  const { id } = await context.params

  try {
    const existing = await getEventById(id)
    if (!existing) {
      return NextResponse.json(
        { success: false, data: null, error: "Evento no encontrado" },
        { status: 404 }
      )
    }

    const { userId, globalRole } = authResult.context
    const allowed = await canEditEvent(
      userId,
      globalRole,
      existing.created_by,
      existing.club_id
    )
    if (!allowed) {
      return NextResponse.json(
        { success: false, data: null, error: "No tienes permisos para eliminar este evento" },
        { status: 403 }
      )
    }

    await deleteEvent(id)
    return NextResponse.json({ success: true, data: null, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[DELETE /api/events/${id}]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al eliminar el evento" },
      { status: 500 }
    )
  }
}
