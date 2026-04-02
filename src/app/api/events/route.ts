import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/lib/auth/authorization"
import { createServiceClient } from "@/lib/supabase/server"
import {
  getFilteredEvents,
  getUpcomingEvents,
  getAllEvents,
  createEvent,
} from "@/lib/events/queries"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import type { ApiResponse } from "@/types"
import type { Event, EventFilters } from "@/lib/events/queries"

// ──────────────────────────────────────────────────────────
// Validation schema for event creation
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

const createEventSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres").max(200),
  description: z.string().max(5000).nullish(),
  sport: z.enum(SPORT_TYPES).nullish(),
  event_type: z.enum(EVENT_TYPES, { message: "Tipo de evento inválido" }),
  club_id: z.string().uuid("club_id inválido").nullish(),
  location: z.string().min(1, "La ubicación es requerida").max(300),
  city: z.string().min(1, "La ciudad es requerida").max(100),
  start_date: z.string().datetime({ message: "Fecha de inicio inválida" }),
  end_date: z.string().datetime({ message: "Fecha de fin inválida" }).nullish(),
  image_url: z.string().url("URL de imagen inválida").nullish(),
  max_capacity: z.number().int().positive().nullish(),
  price: z.number().min(0).default(0),
  is_free: z.boolean().default(true),
  visibility: z.enum(VISIBILITY_TYPES).default("public"),
  registration_deadline: z
    .string()
    .datetime({ message: "Fecha límite inválida" })
    .nullish(),
  min_participants: z.number().int().positive().nullish(),
  tags: z.array(z.string().max(50)).max(10).default([]),
  organizer_name: z.string().max(200).nullish(),
  organizer_contact: z.string().max(200).nullish(),
})

// ──────────────────────────────────────────────────────────
// Permission helper — can user manage events for this club?
// ──────────────────────────────────────────────────────────

async function canManageClubEvents(
  userId: string,
  clubId: string
): Promise<boolean> {
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
// GET /api/events
// ──────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Event[]>>> {
  const { searchParams } = request.nextUrl

  // Support legacy ?all=true and ?upcoming for backwards compat
  const legacyAll = searchParams.get("all") === "true"
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10) || 0)
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "12", 10) || 12)
  )

  try {
    if (!searchParams.has("sport") &&
        !searchParams.has("event_type") &&
        !searchParams.has("city") &&
        !searchParams.has("club_id") &&
        !searchParams.has("status") &&
        !searchParams.has("is_free") &&
        !searchParams.has("from_date") &&
        !searchParams.has("to_date") &&
        !searchParams.has("search") &&
        !legacyAll) {
      const events = await getUpcomingEvents(limit)
      return NextResponse.json({ success: true, data: events, error: null })
    }

    if (legacyAll && !searchParams.has("sport") && !searchParams.has("search")) {
      const result = await getAllEvents(page, limit)
      return NextResponse.json({
        success: true,
        data: result.events,
        error: null,
        meta: { total: result.total, page, limit },
      } as ApiResponse<Event[]> & { meta: unknown })
    }

    const isFreeParam = searchParams.get("is_free")
    const filters: EventFilters = {
      sport: searchParams.get("sport") ?? undefined,
      event_type: searchParams.get("event_type") ?? undefined,
      city: searchParams.get("city") ?? undefined,
      club_id: searchParams.get("club_id") ?? undefined,
      status: searchParams.get("status") ?? undefined,
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

    const result = await getFilteredEvents(filters)
    return NextResponse.json({
      success: true,
      data: result.events,
      error: null,
      meta: { total: result.total, page, limit },
    } as ApiResponse<Event[]> & { meta: unknown })
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener eventos" },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────
// POST /api/events
// ──────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Event>>> {
  // Rate limiting — 10 event creations per hour per IP
  const ip = getClientIp(request)
  const rl = await checkRateLimit("events_create", ip, {
    limit: 10,
    windowMs: 3_600_000,
  })
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes. Intenta más tarde." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      }
    )
  }

  // Auth: must be logged in
  const authResult = await authorize()
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 401 }
    )
  }

  const { userId, globalRole } = authResult.context
  const isAdmin = globalRole === "admin"

  // Parse body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Cuerpo de solicitud inválido" },
      { status: 400 }
    )
  }

  const parsed = createEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  const { club_id } = parsed.data

  // Non-admins creating a club event must be owner/manager of that club
  if (!isAdmin && club_id) {
    const allowed = await canManageClubEvents(userId, club_id)
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "No tienes permisos para crear eventos en este club",
        },
        { status: 403 }
      )
    }
  }

  // Non-admins cannot create platform-level events (no club_id)
  if (!isAdmin && !club_id) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "Solo los administradores pueden crear eventos de plataforma",
      },
      { status: 403 }
    )
  }

  try {
    const event = await createEvent(parsed.data, userId)
    return NextResponse.json(
      { success: true, data: event, error: null },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[POST /api/events]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al crear el evento" },
      { status: 500 }
    )
  }
}
