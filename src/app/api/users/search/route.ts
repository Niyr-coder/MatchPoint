import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) return NextResponse.json({ success: true, data: [] })

  const service = await createServiceClient()
  const { data, error } = await service
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
    .neq("id", user.id)
    .limit(10)

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data ?? [] })
}
