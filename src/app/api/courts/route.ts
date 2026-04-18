import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCourts, getCourtsBySport } from "@/features/clubs/queries/courts"
import { z } from "zod"
import { SPORT_IDS } from "@/lib/sports/config"
import { ok, fail } from "@/lib/api/response"

const getCourtsSchema = z.object({
  sport: z.enum(SPORT_IDS).optional(),
  city: z.string().max(100).trim().optional(),
})

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return fail("Unauthorized", 401)
  }

  const { searchParams } = new URL(request.url)
  const parsed = getCourtsSchema.safeParse({
    sport: searchParams.get("sport") ?? undefined,
    city: searchParams.get("city") ?? undefined,
  })
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }
  const { sport, city } = parsed.data

  try {
    const courts = sport
      ? await getCourtsBySport(sport)
      : await getCourts(city)

    return ok(courts)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener canchas"
    return fail(message, 500)
  }
}
