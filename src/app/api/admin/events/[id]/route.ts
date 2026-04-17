import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { getEventById, updateEvent, deleteEvent } from "@/features/activities/queries"
import { logAdminAction } from "@/lib/audit/log"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { SPORT_IDS } from "@/lib/sports/config"
import type { ApiResponse } from "@/types"
import type { Event } from "@/features/activities/queries"

// ──────────────────────────────────────────────────────────
// Validation schema for admin event updates (all fields optional)
// ──────────────────────────────────────────────────────────

const EVENT_TYPES = [
  "social",
  "clinic",
  "workshop",
  "open_day",
  "exhibition",
  "masterclass",
  "quedada",
  "ranking",
  "other",
] as const

const VISIBILITY_TYPES = ["public", "club_only", "invite_only"] as const

const STATUS_TYPES = ["draft", "published", "cancelled", "completed"] as const

const adminUpdateEventSchema = z
  .object({
    title: z.string().min(3).max(200),
    description: z.string().max(5000).nullish(),
    sport: z.enum(SPORT_IDS).nullish(),
    event_type: z.enum(EVENT_TYPES),
    club_id: z.string().uuid().nullish(),
    location: z.string().min(1).max(300),
    city: z.string().min(1).max(100),
    start_date: z.iso.datetime(),
    end_date: z.iso.datetime().nullish(),
    image_url: z.url().nullish(),
    max_capacity: z.number().int().positive().nullish(),
    price: z.number().min(0),
    is_free: z.boolean(),
    visibility: z.enum(VISIBILITY_TYPES),
    registration_deadline: z.iso.datetime().nullish(),
    min_participants: z.number().int().positive().nullish(),
    tags: z.array(z.string().max(50)).max(10),
    event_includes: z.array(z.string().max(200)).max(20).default([]),
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
// PUT /api/admin/events/[id]
// ──────────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<Event>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  const ctx = authResult.context
  const rl = await checkRateLimit("eventsCreate", ctx.userId, RATE_LIMITS.eventsCreate)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
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

  const parsed = adminUpdateEventSchema.safeParse(body)
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

    const updated = await updateEvent(id, parsed.data)

    await logAdminAction({
      action: "event.updated",
      entityType: "events",
      entityId: id,
      actorId: authResult.context.userId,
      details: { fields: Object.keys(parsed.data) },
    })

    return NextResponse.json({ success: true, data: updated, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[PUT /api/admin/events/${id}]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al actualizar el evento" },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────
// DELETE /api/admin/events/[id]
// ──────────────────────────────────────────────────────────

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

  const ctx = authResult.context
  const rl = await checkRateLimit("eventsCreate", ctx.userId, RATE_LIMITS.eventsCreate)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
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

    await deleteEvent(id)

    await logAdminAction({
      action: "event.deleted",
      entityType: "events",
      entityId: id,
      actorId: authResult.context.userId,
      details: {
        title: existing.title,
        club_id: existing.club_id,
        status: existing.status,
      },
    })

    return NextResponse.json({ success: true, data: null, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[DELETE /api/admin/events/${id}]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al eliminar el evento" },
      { status: 500 }
    )
  }
}
