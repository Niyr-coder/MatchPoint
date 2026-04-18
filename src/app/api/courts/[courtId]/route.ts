import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ok, fail } from "@/lib/api/response"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ courtId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return fail("Unauthorized", 401)
  }

  const { courtId } = await params

  const { data, error } = await supabase
    .from("courts")
    .select("id, name, sport, price_per_hour, clubs(id, name)")
    .eq("id", courtId)
    .eq("is_active", true)
    .single()

  if (error || !data) {
    return fail("Cancha no encontrada", 404)
  }

  return ok(data)
}
