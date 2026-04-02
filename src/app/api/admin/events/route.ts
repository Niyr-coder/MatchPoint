import { NextRequest, NextResponse } from "next/server"
import { authorize } from "@/lib/auth/authorization"
import { getAllEventsAdmin } from "@/lib/events/queries"
import { logAdminAction } from "@/lib/audit/log"
import type { ApiResponse } from "@/types"
import type { Event, EventFilters } from "@/lib/events/queries"

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
