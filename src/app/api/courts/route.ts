import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCourts, getCourtsBySport } from "@/lib/courts/queries"
import type { SportType } from "@/lib/courts/queries"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sport = searchParams.get("sport") as SportType | null
  const city = searchParams.get("city") ?? undefined

  try {
    const courts = sport
      ? await getCourtsBySport(sport)
      : await getCourts(city)

    return NextResponse.json({ success: true, data: courts })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener canchas"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
