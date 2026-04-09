import { NextRequest, NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { createClient } from "@/lib/supabase/server"
import {
  getEventById,
  getUserEventRegistration,
  registerForEvent,
  unregisterFromEvent,
} from "@/features/activities/queries"
import type { ApiResponse } from "@/types"
import type { EventRegistration } from "@/features/activities/queries"

interface RouteContext {
  params: Promise<{ id: string }>
}

// ──────────────────────────────────────────────────────────
// POST /api/events/[id]/register
// ──────────────────────────────────────────────────────────

export async function POST(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<EventRegistration>>> {
  const authResult = await authorize()
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 401 }
    )
  }

  const { id: eventId } = await context.params
  const { userId } = authResult.context

  try {
    // Verify event exists and is registerable
    const event = await getEventById(eventId)
    if (!event) {
      return NextResponse.json(
        { success: false, data: null, error: "Evento no encontrado" },
        { status: 404 }
      )
    }

    if (event.status !== "published") {
      return NextResponse.json(
        { success: false, data: null, error: "El evento no está disponible para registro" },
        { status: 409 }
      )
    }

    // Check registration deadline
    if (event.registration_deadline) {
      const deadline = new Date(event.registration_deadline)
      if (new Date() > deadline) {
        return NextResponse.json(
          { success: false, data: null, error: "El plazo de registro ha expirado" },
          { status: 409 }
        )
      }
    }

    // Check capacity — use count query instead of fetching all registrations
    if (event.max_capacity !== null) {
      const supabase = await createClient()
      const { count, error: countErr } = await supabase
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)

      if (countErr) {
        return NextResponse.json(
          { success: false, data: null, error: "Error al verificar capacidad" },
          { status: 500 }
        )
      }

      if (count !== null && count >= event.max_capacity) {
        return NextResponse.json(
          { success: false, data: null, error: "El evento está lleno" },
          { status: 409 }
        )
      }
    }

    // Check if already registered
    const existing = await getUserEventRegistration(eventId, userId)
    if (existing) {
      return NextResponse.json(
        { success: false, data: null, error: "Ya estás registrado en este evento" },
        { status: 409 }
      )
    }

    const registration = await registerForEvent(eventId, userId)
    return NextResponse.json(
      { success: true, data: registration, error: null },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[POST /api/events/${eventId}/register]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al registrarse en el evento" },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────
// DELETE /api/events/[id]/register
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

  const { id: eventId } = await context.params
  const { userId } = authResult.context

  try {
    // Verify event exists
    const event = await getEventById(eventId)
    if (!event) {
      return NextResponse.json(
        { success: false, data: null, error: "Evento no encontrado" },
        { status: 404 }
      )
    }

    // Verify user is registered
    const existing = await getUserEventRegistration(eventId, userId)
    if (!existing) {
      return NextResponse.json(
        { success: false, data: null, error: "No estás registrado en este evento" },
        { status: 404 }
      )
    }

    await unregisterFromEvent(eventId, userId)
    return NextResponse.json({ success: true, data: null, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[DELETE /api/events/${eventId}/register]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al cancelar el registro" },
      { status: 500 }
    )
  }
}
