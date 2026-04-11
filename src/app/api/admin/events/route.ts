import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { getAllEventsAdmin, createEvent } from "@/features/activities/queries"
import { logAdminAction } from "@/lib/audit/log"
import { SPORT_IDS } from "@/lib/sports/config"
import type { ApiResponse } from "@/types"
import type { Event, EventFilters } from "@/features/activities/queries"

// ──────────────────────────────────────────────────────────
// Validation schema for admin event creation
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

const adminCreateEventSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres").max(200),
  description: z.string().max(5000).nullish(),
  sport: z.enum(SPORT_IDS).nullish(),
  event_type: z.enum(EVENT_TYPES, { message: "Tipo de evento inválido" }),
  club_id: z.string().uuid("club_id inválido").nullish(),
  location: z.string().min(1, "La ubicación es requerida").max(300),
  city: z.string().min(1, "La ciudad es requerida").max(100),
  start_date: z.iso.datetime(),
  end_date: z.iso.datetime().nullish(),
  image_url: z.url().nullish(),
  max_capacity: z.number().int().positive().nullish(),
  price: z.number().min(0).default(0),
  is_free: z.boolean().default(true),
  visibility: z.enum(VISIBILITY_TYPES).default("public"),
  registration_deadline: z.iso.datetime().nullish(),
  min_participants: z.number().int().positive().nullish(),
  tags: z.array(z.string().max(50)).max(10).default([]),
  organizer_name: z.string().max(200).nullish(),
  organizer_contact: z.string().max(200).nullish(),
})

// ──────────────────────────────────────────────────────────
// GET /api/admin/events
// Returns all events regardless of status, with filters
// ──────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Event[]>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  const { searchParams } = request.nextUrl
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10) || 0)
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20)
  )

  const isFreeParam = searchParams.get("is_free")
  const filters: Omit<EventFilters, "status"> = {
    sport: searchParams.get("sport") ?? undefined,
    event_type: searchParams.get("event_type") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    club_id: searchParams.get("club_id") ?? undefined,
    is_free:
      isFreeParam === "true"
        ? true
        : isFreeParam === "false"
        ? false
        : undefined,
    from_date: searchParams.get("from_date") ?? undefined,
    to_date: searchParams.get("to_date") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    page,
    limit,
  }

  try {
    const result = await getAllEventsAdmin(filters)

    await logAdminAction({
      action: "events.listed",
      entityType: "events",
      actorId: authResult.context.userId,
      details: { filters, total: result.total },
    })

    return NextResponse.json({
      success: true,
      data: result.events,
      error: null,
      meta: { total: result.total, page, limit },
    } as ApiResponse<Event[]> & { meta: unknown })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[GET /api/admin/events]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener los eventos" },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────
// POST /api/admin/events
// Admin-only event creation (no rate limiting, no club restriction)
// ──────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Event>>> {
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

  const parsed = adminCreateEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  try {
    const event = await createEvent(parsed.data, authResult.context.userId)

    await logAdminAction({
      action: "event.created",
      entityType: "events",
      entityId: event.id,
      actorId: authResult.context.userId,
      details: { title: event.title, club_id: event.club_id },
    })

    return NextResponse.json(
      { success: true, data: event, error: null },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[POST /api/admin/events]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al crear el evento" },
      { status: 500 }
    )
  }
}
