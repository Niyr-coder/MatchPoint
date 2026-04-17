import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { MatchStats } from "@/features/tournaments/types"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 })

  const service = createServiceClient()
  const { data, error } = await service.rpc("get_match_stats", { tournament_id: id })

  if (error) return NextResponse.json({ success: false, data: null, error: error.message }, { status: 500 })

  const stats = (data ?? []) as MatchStats[]
  return NextResponse.json({ success: true, data: stats, error: null })
}
