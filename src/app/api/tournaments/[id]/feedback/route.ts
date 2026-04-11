import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { authorize } from "@/features/auth/queries"
import type { ApiResponse } from "@/types"
import type { TournamentFeedback } from "@/features/tournaments/types"

const feedbackSchema = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().max(500).nullish(),
})

interface FeedbackMeta { average_rating: number; count: number }

// GET /api/tournaments/[id]/feedback
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<TournamentFeedback[]> & { meta: FeedbackMeta }>> {
  const authResult = await authorize({})
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado", meta: { average_rating: 0, count: 0 } },
      { status: 401 }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("tournament_feedback")
    .select("*, profiles(username, full_name)")
    .eq("tournament_id", id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener feedback", meta: { average_rating: 0, count: 0 } },
      { status: 500 }
    )
  }

  const items = (data ?? []) as TournamentFeedback[]
  const count = items.length
  const average_rating = count > 0
    ? Math.round((items.reduce((sum, f) => sum + f.rating, 0) / count) * 10) / 10
    : 0

  return NextResponse.json({
    success: true,
    data: items,
    error: null,
    meta: { average_rating, count },
  })
}

// POST /api/tournaments/[id]/feedback
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<TournamentFeedback>>> {
  const authResult = await authorize({})
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 401 }
    )
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
    return NextResponse.json(
      { success: false, data: null, error: "Solo puedes dejar feedback en torneos completados" },
      { status: 422 }
    )
  }

  const { data: participant } = await supabase
    .from("tournament_participants")
    .select("id")
    .eq("tournament_id", id)
    .eq("user_id", authResult.context.userId)
    .neq("status", "withdrawn")
    .maybeSingle()

  if (!participant) {
    return NextResponse.json(
      { success: false, data: null, error: "Solo los participantes pueden dejar feedback" },
      { status: 403 }
    )
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Cuerpo inválido" },
      { status: 400 }
    )
  }

  const parsed = feedbackSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
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
    return NextResponse.json(
      { success: false, data: null, error: "Error al guardar feedback" },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data: data as TournamentFeedback, error: null }, { status: 201 })
}
