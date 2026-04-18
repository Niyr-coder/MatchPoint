import { NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { ok, fail } from "@/lib/api/response"

export async function GET() {
  const auth = await authorize({ requiredRoles: ["admin"] })
  if (!auth.ok) {
    return fail("Unauthorized", 401)
  }

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("audit_log")
      .select("id, action, entity_type, details, created_at")
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) throw error
    return ok(data ?? [])
  } catch (err) {
    console.error("[GET /api/admin/activity-feed]", err)
    return fail("Error al cargar la actividad", 500)
  }
}
