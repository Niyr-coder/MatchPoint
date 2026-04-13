import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Auth check — analytics contain participant data, must be authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 })
    }

    // Verify tournament exists
    const { data: tournament, error: tErr } = await supabase
      .from("tournaments")
      .select("id, created_by, status, max_participants")
      .eq("id", id)
      .single()

    if (tErr || !tournament) {
      return NextResponse.json({ success: false, error: "Torneo no encontrado" }, { status: 404 })
    }

    // Fetch participants with registration dates
    const { data: participants, error: pErr } = await supabase
      .from("tournament_participants")
      .select("registered_at, status")
      .eq("tournament_id", id)
      .neq("status", "withdrawn")
      .order("registered_at")

    if (pErr) {
      return NextResponse.json({ success: false, error: pErr.message }, { status: 500 })
    }

    // Fetch feedback for completed tournaments
    const { data: feedbackRows, error: fErr } = await supabase
      .from("tournament_feedback")
      .select("rating")
      .eq("tournament_id", id)

    if (fErr) {
      return NextResponse.json({ success: false, error: fErr.message }, { status: 500 })
    }

    // Inscriptions by day
    const byDay: Record<string, number> = {}
    for (const p of participants ?? []) {
      const day = p.registered_at.slice(0, 10)
      byDay[day] = (byDay[day] ?? 0) + 1
    }

    // Build cumulative timeline
    const sortedDays = Object.keys(byDay).sort()
    let cumulative = 0
    const inscriptions_by_day = sortedDays.map(date => {
      cumulative += byDay[date]
      return { date, daily: byDay[date], total: cumulative }
    })

    // Rating distribution
    const ratingCount: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const row of feedbackRows ?? []) {
      ratingCount[row.rating] = (ratingCount[row.rating] ?? 0) + 1
    }
    const rating_distribution = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: ratingCount[rating] ?? 0,
    }))

    const totalFeedback = (feedbackRows ?? []).length
    const avgRating = totalFeedback > 0
      ? (feedbackRows ?? []).reduce((sum, r) => sum + r.rating, 0) / totalFeedback
      : null

    return NextResponse.json({
      success: true,
      data: {
        inscriptions_by_day,
        rating_distribution,
        total_participants: (participants ?? []).length,
        max_participants: tournament.max_participants,
        avg_rating: avgRating !== null ? Math.round(avgRating * 10) / 10 : null,
        total_feedback: totalFeedback,
        status: tournament.status,
      },
    })
  } catch (err) {
    console.error("[analytics] unexpected error", err)
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
  }
}
