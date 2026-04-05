import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCourts, getCourtsBySport } from "@/lib/courts/queries"
import { z } from "zod"
import { SPORT_IDS } from "@/lib/sports/config"

const getCourtsSchema = z.object({
  sport: z.enum(SPORT_IDS).optional(),
  city: z.string().max(100).trim().optional(),
})

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = getCourtsSchema.safeParse({
    sport: searchParams.get("sport") ?? undefined,
    city: searchParams.get("city") ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { sport, city } = parsed.data

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
