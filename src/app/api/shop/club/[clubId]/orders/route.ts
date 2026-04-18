import { NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { ok, fail } from "@/lib/api/response"

export async function GET(
  request: Request,
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

  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
  const PAGE_SIZE = 20
  const offset = (page - 1) * PAGE_SIZE

  const supabase = createServiceClient()
  const { data, count, error } = await supabase
    .from("orders")
    .select(
      `id, total, status, proof_url, created_at,
       profiles!user_id(full_name, email),
       order_items(product_name, quantity, unit_price)`,
      { count: "exact" }
    )
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) {
    console.error("Error fetching club orders:", error)
    return fail("Error al cargar", 500)
  }

  const orders = (data ?? []).map((o: any) => ({
    id: o.id,
    user_name: (o.profiles as any)?.full_name ?? "—",
    user_email: (o.profiles as any)?.email ?? "—",
    total: o.total,
    status: o.status,
    proof_url: o.proof_url,
    created_at: o.created_at,
    items: o.order_items ?? [],
  }))

  return ok({ orders, meta: { total: count ?? 0, page, limit: PAGE_SIZE } })
}
