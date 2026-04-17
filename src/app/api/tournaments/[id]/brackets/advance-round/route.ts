import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { ok, fail } from "@/lib/api/response"

const postSchema = z.object({
  current_round: z.number().int().min(1, "current_round debe ser >= 1"),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params

  // Parse and validate body
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return fail("JSON inválido")
  }

  const parsed = postSchema.safeParse(rawBody)
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(", ")
    return fail(message)
  }

  const { current_round } = parsed.data

  // Fetch tournament for auth context
  const supabase = await createClient()
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("club_id, created_by")
    .eq("id", tournamentId)
    .single()

  if (tournamentError || !tournament) {
    return fail("Tournament not found", 404)
  }

  // Auth: tournament creator OR MANAGER/OWNER in the club
  const authResult = await authorize({
    clubId: tournament.club_id ?? null,
    requiredRoles: ["manager", "owner", "admin"],
  })

  if (!authResult.ok) {
    // Fall back: allow tournament creator
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || tournament.created_by !== user.id) {
      return fail("Forbidden", 403)
    }
  }

  // Verify all matches in current_round are completed or bye
  const service = createServiceClient()
  const { count: pendingCount, error: pendingError } = await service
    .from("tournament_brackets")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("round", current_round)
    .not("status", "in", '("completed","bye")')

  if (pendingError) {
    console.error(
      "[POST /api/tournaments/[id]/brackets/advance-round] DB error",
      { tournamentId, current_round, error: pendingError.message }
    )
    return fail("Internal server error", 500)
  }

  // Also verify the round actually has matches (guards against invalid round numbers)
  const { count: totalCount, error: totalError } = await service
    .from("tournament_brackets")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("round", current_round)

  if (totalError) {
    console.error(
      "[POST /api/tournaments/[id]/brackets/advance-round] DB error on total count",
      { tournamentId, current_round, error: totalError.message }
    )
    return fail("Internal server error", 500)
  }

  if ((totalCount ?? 0) === 0) {
    return fail(
      `No se encontraron partidos para la ronda ${current_round}`,
      404
    )
  }

  if ((pendingCount ?? 0) > 0) {
    return fail("Hay partidos pendientes en la ronda actual", 409)
  }

  return ok({
    advanced:   true,
    next_round: current_round + 1,
  })
}
