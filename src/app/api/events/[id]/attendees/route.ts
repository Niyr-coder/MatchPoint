import { NextRequest, NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import {
  getEventById,
  getEventRegistrations,
} from "@/features/activities/queries"
import type { ApiResponse } from "@/types"
import type { EventRegistrationWithProfile } from "@/features/activities/queries"
import { ok, fail } from "@/lib/api/response"

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
    return fail("No autorizado", 401)
  }

  const { id: eventId } = await context.params
  const { userId, globalRole } = authResult.context

  try {
    const event = await getEventById(eventId)
    if (!event) {
      return fail("Evento no encontrado", 404)
    }

    const allowed = await canViewAttendees(
      userId,
      globalRole,
      event.created_by,
      event.club_id
    )
    if (!allowed) {
      return fail("No tienes permisos para ver los asistentes de este evento", 403)
    }

    const registrations = await getEventRegistrations(eventId)
    return ok(registrations)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[GET /api/events/${eventId}/attendees]`, message)
    return fail("Error al obtener los asistentes", 500)
  }
}
