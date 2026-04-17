import { NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params
  const auth = await authorize({ clubId, requiredRoles: ["owner", "manager"] })
  if (!auth.ok) {
    return NextResponse.json({ success: false, data: null, error: "Sin permisos" }, { status: 403 })
  }

  const { userId } = auth.context
  const rl = await checkRateLimit("shopClubRead", userId, RATE_LIMITS.shopClubRead)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, category, stock, is_active, approval_status, created_at")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching club products:", error)
    return NextResponse.json({ success: false, data: null, error: "Error al cargar" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data ?? [], error: null })
}
