import { NextRequest, NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import {
  getEventById,
  getUserEventRegistration,
  registerForEventAtomic,
  unregisterFromEvent,
} from "@/features/activities/queries"
import type { ApiResponse } from "@/types"
import { ok, fail } from "@/lib/api/response"

interface RouteContext {
  params: Promise<{ id: string }>
}

// ──────────────────────────────────────────────────────────
// POST /api/events/[id]/register
// ──────────────────────────────────────────────────────────

export async function POST(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  const authResult = await authorize()
  if (!authResult.ok) {
    return fail("No autorizado", 401)
  }

  const { id: eventId } = await context.params
  const { userId } = authResult.context

  try {
    // Verify event exists and is registerable
    const event = await getEventById(eventId)
    if (!event) {
      return fail("Evento no encontrado", 404)
    }

    if (event.status !== "published") {
      return fail("El evento no está disponible para registro", 409)
    }

    // Check registration deadline
    if (event.registration_deadline) {
      const deadline = new Date(event.registration_deadline)
      if (new Date() > deadline) {
        return fail("El plazo de registro ha expirado", 409)
      }
    }

    try {
      const registration = await registerForEventAtomic(eventId, userId)
      return ok(registration, 201)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.includes("EVENT_NOT_PUBLISHED")) {
        return fail("El evento no está disponible para registro", 409)
      }
      if (msg.includes("EVENT_FULL")) {
        return fail("El evento está lleno", 409)
      }
      if (msg.includes("EVENT_NOT_FOUND")) {
        return fail("Evento no encontrado", 404)
      }
      // Unique constraint violation = already registered
      if (msg.includes("23505") || msg.includes("unique")) {
        return fail("Ya estás registrado en este evento", 409)
      }
      console.error(`[POST /api/events/${eventId}/register]`, msg)
      return fail("Error al registrarse en el evento", 500)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[POST /api/events/${eventId}/register]`, message)
    return fail("Error al registrarse en el evento", 500)
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
    return fail("No autorizado", 401)
  }

  const { id: eventId } = await context.params
  const { userId } = authResult.context

  try {
    // Verify event exists
    const event = await getEventById(eventId)
    if (!event) {
      return fail("Evento no encontrado", 404)
    }

    // Verify user is registered
    const existing = await getUserEventRegistration(eventId, userId)
    if (!existing) {
      return fail("No estás registrado en este evento", 404)
    }

    await unregisterFromEvent(eventId, userId)
    return ok(null)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[DELETE /api/events/${eventId}/register]`, message)
    return fail("Error al cancelar el registro", 500)
  }
}
