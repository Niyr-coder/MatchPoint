import { NextRequest, NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import type { ApiResponse } from "@/types"

// ── types ──────────────────────────────────────────────────────────────────────

export type AdminOrder = {
  id: string
  user_name: string
  user_email: string
  product_name: string
  quantity: number
  unit_price: number
  total: number
  status: "pending" | "pending_proof" | "confirmed" | "delivered" | "cancelled"
  proof_url: string | null
  club_id: string | null
  club_name: string | null
  created_at: string
}

export type AdminPendingProduct = {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  category: string
  club_name: string
  submitter_name: string
  submitter_email: string
  created_at: string
}

export type AdminProduct = {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  category: string
  is_active: boolean
  club_id: string | null
  club_name: string | null
  created_at: string
}

export type AdminShopStats = {
  total_revenue: number
  pending_orders: number
  active_products: number
}

export type AdminShopData = {
  orders?: AdminOrder[]
  products?: AdminProduct[]
  pendingProducts?: AdminPendingProduct[]
  stats: AdminShopStats
  meta: { total: number; page: number; limit: number }
}

// ── GET /api/admin/shop ────────────────────────────────────────────────────────
// ?type=orders|products&club_id=X&status=X&page=N

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AdminShopData>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  const ctx = authResult.context
  const rl = await checkRateLimit("adminSearch", ctx.userId, RATE_LIMITS.adminSearch)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }

  const { searchParams } = request.nextUrl
  const type = searchParams.get("type") ?? "orders"
  const clubId = searchParams.get("club_id") ?? null
  const status = searchParams.get("status") ?? null
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = 20
  const offset = (page - 1) * limit

  try {
    const supabase = createServiceClient()

    // Fetch aggregated stats in parallel
    const [revenueResult, pendingResult, activeProductsResult] = await Promise.all([
      supabase
        .from("orders")
        .select("total")
        .not("status", "eq", "cancelled"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
    ])

    const totalRevenue = (revenueResult.data ?? []).reduce(
      (sum: number, row: { total: number }) => sum + Number(row.total),
      0
    )
    const stats: AdminShopStats = {
      total_revenue: totalRevenue,
      pending_orders: pendingResult.count ?? 0,
      active_products: activeProductsResult.count ?? 0,
    }

    if (type === "products") {
      let query = supabase
        .from("products")
        .select(
          "id, name, description, price, stock, category, is_active, club_id, clubs(name), created_at",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1)

      if (clubId) query = query.eq("club_id", clubId)

      const { data, error, count } = await query
      if (error) throw new Error(error.message)

      type ProductRow = {
        id: string; name: string; description: string | null; price: number
        stock: number; category: string; is_active: boolean; club_id: string | null
        clubs: { name: string } | null; created_at: string
      }
      const products: AdminProduct[] = ((data ?? []) as unknown as ProductRow[]).map(
        (row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          price: Number(row.price),
          stock: row.stock,
          category: row.category,
          is_active: row.is_active,
          club_id: row.club_id,
          club_name: row.clubs?.name ?? null,
          created_at: row.created_at,
        })
      )

      return NextResponse.json({
        success: true,
        data: { products, stats, meta: { total: count ?? 0, page, limit } },
        error: null,
      })
    }

    if (type === "pending") {
      const { data: pendingData, count: pendingCount, error: pendingError } = await supabase
        .from("products")
        .select(
          `id, name, description, price, stock, category, created_at,
           clubs!inner(name),
           profiles!created_by(full_name, email)`,
          { count: "exact" }
        )
        .eq("approval_status", "pending_approval")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1)

      if (pendingError) throw new Error(pendingError.message)

      type PendingRow = {
        id: string; name: string; description: string | null; price: number
        stock: number; category: string; created_at: string
        clubs: { name: string } | null
        profiles: { full_name: string | null; email: string } | null
      }
      const pendingProducts: AdminPendingProduct[] = ((pendingData ?? []) as unknown as PendingRow[]).map(
        (row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          price: Number(row.price),
          stock: row.stock,
          category: row.category,
          club_name: row.clubs?.name ?? "—",
          submitter_name: row.profiles?.full_name ?? "—",
          submitter_email: row.profiles?.email ?? "—",
          created_at: row.created_at,
        })
      )

      return NextResponse.json({
        success: true,
        data: {
          pendingProducts,
          stats,
          meta: { total: pendingCount ?? 0, page, limit },
        },
        error: null,
      })
    }

    // Default: orders
    let query = supabase
      .from("orders")
      .select(
        `id, total, status, proof_url, club_id, created_at,
         profiles(full_name, email),
         clubs(name),
         order_items(quantity, unit_price, product_name)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (clubId) query = query.eq("club_id", clubId)
    if (status) query = query.eq("status", status)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    type OrderRow = {
      id: string; total: number; status: "pending" | "pending_proof" | "confirmed" | "delivered" | "cancelled"
      proof_url: string | null; club_id: string | null; created_at: string
      profiles: { full_name: string | null; email: string } | null
      clubs: { name: string } | null
      order_items: { quantity: number; unit_price: number; product_name: string }[]
    }
    const orders: AdminOrder[] = ((data ?? []) as unknown as OrderRow[]).map((row) => {
        const firstItem = row.order_items?.[0]
        return {
          id: row.id,
          user_name: row.profiles?.full_name ?? "Usuario desconocido",
          user_email: row.profiles?.email ?? "",
          product_name: firstItem?.product_name ?? "Producto eliminado",
          quantity: firstItem?.quantity ?? 0,
          unit_price: Number(firstItem?.unit_price ?? 0),
          total: Number(row.total),
          status: row.status,
          proof_url: row.proof_url,
          club_id: row.club_id,
          club_name: row.clubs?.name ?? null,
          created_at: row.created_at,
        }
      }
    )

    return NextResponse.json({
      success: true,
      data: { orders, stats, meta: { total: count ?? 0, page, limit } },
      error: null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[admin/shop] GET failed:", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener datos del shop" },
      { status: 500 }
    )
  }
}
