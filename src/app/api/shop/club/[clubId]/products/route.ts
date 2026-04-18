import { NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { ok, fail } from "@/lib/api/response"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params
  const auth = await authorize({ clubId, requiredRoles: ["owner", "manager"] })
  if (!auth.ok) {
    return fail("Sin permisos", 403)
  }

  const { userId } = auth.context
  const rl = await checkRateLimit("shopClubRead", userId, RATE_LIMITS.shopClubRead)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta más tarde.", 429)
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, category, stock, is_active, approval_status, created_at")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching club products:", error)
    return fail("Error al cargar", 500)
  }

  return ok(data ?? [])
}
