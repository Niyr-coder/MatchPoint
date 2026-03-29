import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { joinTournament, isUserInTournament, getTournamentById } from "@/lib/tournaments/queries"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const tournament = await getTournamentById(id)
    if (!tournament) {
      return NextResponse.json({ success: false, error: "Torneo no encontrado" }, { status: 404 })
    }

    if (tournament.status !== "open") {
      return NextResponse.json(
        { success: false, error: "El torneo no está abierto para inscripciones" },
        { status: 409 }
      )
    }

    const alreadyJoined = await isUserInTournament(id, user.id)
    if (alreadyJoined) {
      return NextResponse.json(
        { success: false, error: "Ya estás inscrito en este torneo" },
        { status: 409 }
      )
    }

    const participant = await joinTournament(id, user.id)
    return NextResponse.json({ success: true, data: participant }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al inscribirse al torneo"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
