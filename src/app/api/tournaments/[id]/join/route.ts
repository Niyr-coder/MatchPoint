import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { joinTournament, isUserInTournament, getTournamentById } from "@/features/tournaments/queries"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { ok, fail } from "@/lib/api/response"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return fail("Unauthorized", 401)
  }

  const rl = await checkRateLimit("tournamentJoin", user.id, RATE_LIMITS.tournamentJoin)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta más tarde.", 429)
  }

  const { id } = await params

  try {
    const tournament = await getTournamentById(id)
    if (!tournament) {
      return fail("Torneo no encontrado", 404)
    }

    if (tournament.status !== "open") {
      return fail("El torneo no está abierto para inscripciones", 409)
    }

    const alreadyJoined = await isUserInTournament(id, user.id)
    if (alreadyJoined) {
      return fail("Ya estás inscrito en este torneo", 409)
    }

    // A2: Validate max_participants before allowing join
    if (tournament.max_participants) {
      const { count, error: countErr } = await supabase
        .from("tournament_participants")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", id)
        .neq("status", "withdrawn")

      if (countErr) {
        return fail("Error al verificar participantes", 500)
      }

      if (count !== null && count >= tournament.max_participants) {
        return fail(`El torneo está lleno (máx. ${tournament.max_participants} participantes)`, 409)
      }
    }

    const participant = await joinTournament(id, user.id)
    return ok(participant, 201)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al inscribirse al torneo"
    return fail(message, 500)
  }
}
