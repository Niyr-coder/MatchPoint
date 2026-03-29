import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUpcomingEvents, getAllEvents } from "@/lib/events/queries"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const all = searchParams.get("all") === "true"
  const page = parseInt(searchParams.get("page") ?? "0", 10)

  try {
    if (all) {
      const result = await getAllEvents(page)
      return NextResponse.json({ success: true, data: result.events, meta: { total: result.total, page } })
    }

    const events = await getUpcomingEvents()
    return NextResponse.json({ success: true, data: events })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener eventos"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
