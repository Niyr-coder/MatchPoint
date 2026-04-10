import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { joinTournament, isUserInTournament, getTournamentById } from "@/features/tournaments/queries"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const rl = await checkRateLimit("tournamentJoin", user.id, RATE_LIMITS.tournamentJoin)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Demasiadas solicitudes. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
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

    // A2: Validate max_participants before allowing join
    if (tournament.max_participants) {
      const { count, error: countErr } = await supabase
        .from("tournament_participants")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", id)
        .neq("status", "withdrawn")

      if (countErr) {
        return NextResponse.json({ success: false, error: "Error al verificar participantes" }, { status: 500 })
      }

      if (count !== null && count >= tournament.max_participants) {
        return NextResponse.json(
          { success: false, error: `El torneo está lleno (máx. ${tournament.max_participants} participantes)` },
          { status: 409 }
        )
      }
    }

    const participant = await joinTournament(id, user.id)
    return NextResponse.json({ success: true, data: participant }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al inscribirse al torneo"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
