import { NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET() {
  const auth = await authorize({ requiredRoles: ["admin"] })
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("audit_log")
      .select("id, action, entity_type, details, created_at")
      .order("created_at", { ascending: false })
      .limit(40)

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
