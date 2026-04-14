import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// ---------------------------------------------------------------------------
// GET /api/clubs/[clubId]/reservations — week availability endpoint
// Returns all non-cancelled reservations for a club's courts in a date range
// Used by ClubWeekCalendar to render court×hour availability grid
// ---------------------------------------------------------------------------

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params

  if (!clubId) {
    return NextResponse.json({ success: false, data: null, error: "clubId requerido" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const weekStart = url.searchParams.get("weekStart")
  const weekEnd = url.searchParams.get("weekEnd")

  if (!weekStart || !weekEnd) {
    return NextResponse.json({ success: false, data: null, error: "weekStart y weekEnd son requeridos" }, { status: 400 })
  }

  const service = createServiceClient()

  // Fetch active courts for this club
  const { data: courts, error: courtsError } = await service
    .from("courts")
    .select("id, name, price_per_hour, sport")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("name", { ascending: true })

  if (courtsError) {
    console.error("[GET /api/clubs/[clubId]/reservations] courts error:", courtsError.message)
    return NextResponse.json({ success: false, data: null, error: "Error al obtener canchas" }, { status: 500 })
  }

  // If no courts, return empty result
  if (!courts || courts.length === 0) {
    return NextResponse.json({ success: true, data: { courts: [], reservations: [] }, error: null })
  }

  const courtIds = courts.map((c) => c.id)

  // Fetch reservations in the date range for these courts
  const { data: reservations, error: reservationsError } = await service
    .from("reservations")
    .select("court_id, date, start_time, end_time")
    .in("court_id", courtIds)
    .gte("date", weekStart)
    .lte("date", weekEnd)
    .neq("status", "cancelled")

  if (reservationsError) {
    console.error("[GET /api/clubs/[clubId]/reservations] reservations error:", reservationsError.message)
    return NextResponse.json({ success: false, data: null, error: "Error al obtener reservas" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: { courts, reservations: reservations ?? [] }, error: null })
}
