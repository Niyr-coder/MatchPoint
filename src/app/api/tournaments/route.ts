import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getOpenTournaments, createTournament } from "@/lib/tournaments/queries"
import { z } from "zod"

const createTournamentSchema = z.object({
  name: z.string().min(3).max(100),
  sport: z.enum(["futbol", "padel", "tenis", "pickleball"]),
  description: z.string().max(1000).optional(),
  max_participants: z.number().int().min(2).max(256),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  entry_fee: z.number().min(0),
  club_id: z.string().uuid().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const tournaments = await getOpenTournaments()
    return NextResponse.json({ success: true, data: tournaments })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener torneos"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createTournamentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  try {
    const tournament = await createTournament(user.id, parsed.data)
    return NextResponse.json({ success: true, data: tournament }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al crear torneo"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
