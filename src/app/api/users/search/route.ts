import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { ok, fail } from "@/lib/api/response"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail("Unauthorized", 401)

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) return ok([])

  // Escape PostgREST filter metacharacters to prevent filter injection
  const safe = q.replace(/[%_\\,().]/g, "\\$&")

  const service = createServiceClient()
  const { data, error } = await service
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .or(`full_name.ilike.%${safe}%,username.ilike.%${safe}%`)
    .neq("id", user.id)
    .limit(10)

  if (error) return fail(error.message, 500)
  return ok(data ?? [])
}
