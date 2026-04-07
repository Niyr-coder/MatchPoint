import { NextRequest, NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import {
  getEventById,
  getEventRegistrations,
} from "@/features/activities/queries"
import type { ApiResponse } from "@/types"
import type { EventRegistrationWithProfile } from "@/features/activities/queries"

interface RouteContext {
  params: Promise<{ id: string }>
}

// ──────────────────────────────────────────────────────────
// Permission helper — can user view the attendee list?
// ──────────────────────────────────────────────────────────

async function canViewAttendees(
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
// GET /api/events/[id]/attendees
// ──────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<EventRegistrationWithProfile[]>>> {
  const authResult = await authorize()
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 401 }
    )
  }

  const { id: eventId } = await context.params
  const { userId, globalRole } = authResult.context

  try {
    const event = await getEventById(eventId)
    if (!event) {
      return NextResponse.json(
        { success: false, data: null, error: "Evento no encontrado" },
        { status: 404 }
      )
    }

    const allowed = await canViewAttendees(
      userId,
      globalRole,
      event.created_by,
      event.club_id
    )
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "No tienes permisos para ver los asistentes de este evento",
        },
        { status: 403 }
      )
    }

    const registrations = await getEventRegistrations(eventId)
    return NextResponse.json({
      success: true,
      data: registrations,
      error: null,
      meta: { total: registrations.length },
    } as ApiResponse<EventRegistrationWithProfile[]> & { meta: unknown })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[GET /api/events/${eventId}/attendees]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener los asistentes" },
      { status: 500 }
    )
  }
}
