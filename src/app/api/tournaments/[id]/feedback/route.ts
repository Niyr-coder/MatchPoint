import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { authorize } from "@/features/auth/queries"
import type { ApiResponse } from "@/types"
import type { TournamentFeedback } from "@/features/tournaments/types"
import { ok, fail } from "@/lib/api/response"

const feedbackSchema = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().max(500).nullish(),
})

interface FeedbackMeta { average_rating: number; count: number }

// GET /api/tournaments/[id]/feedback
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<TournamentFeedback[]>>> {
  const authResult = await authorize({})
  if (!authResult.ok) {
    return fail("No autorizado", 401)
  }

  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("tournament_feedback")
    .select("*, profiles(username, full_name)")
    .eq("tournament_id", id)
    .order("created_at", { ascending: false })

  if (error) {
    return fail("Error al obtener feedback", 500)
  }

  const items = (data ?? []) as TournamentFeedback[]
  const count = items.length
  const average_rating = count > 0
    ? Math.round((items.reduce((sum, f) => sum + f.rating, 0) / count) * 10) / 10
    : 0

  return ok(items)
}

// POST /api/tournaments/[id]/feedback
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<TournamentFeedback>>> {
  const authResult = await authorize({})
  if (!authResult.ok) {
    return fail("No autorizado", 401)
  }

  const { id } = await params
  const supabase = await createClient()

  // Validate tournament is completed and user is a participant
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("status")
    .eq("id", id)
    .single()

  if (!tournament || tournament.status !== "completed") {
    return fail("Solo puedes dejar feedback en torneos completados", 422)
  }

  const { data: participant } = await supabase
    .from("tournament_participants")
    .select("id")
    .eq("tournament_id", id)
    .eq("user_id", authResult.context.userId)
    .neq("status", "withdrawn")
    .maybeSingle()

  if (!participant) {
    return fail("Solo los participantes pueden dejar feedback", 403)
  }

  let body: unknown
  try { body = await req.json() } catch {
    return fail("Cuerpo inválido")
  }

  const parsed = feedbackSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  const { data, error } = await supabase
    .from("tournament_feedback")
    .upsert({
      tournament_id: id,
      user_id: authResult.context.userId,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
    }, { onConflict: "tournament_id,user_id" })
    .select("*, profiles(username, full_name)")
    .single()

  if (error) {
    return fail("Error al guardar feedback", 500)
  }

  return ok(data as TournamentFeedback, 201)
}
