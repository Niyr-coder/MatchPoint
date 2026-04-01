import { NextRequest, NextResponse } from "next/server"
import { authorize } from "@/lib/auth/authorization"
import { createServiceClient } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface ClubRequestWithRequester {
  id: string
  user_id: string
  requester_full_name: string | null
  requester_username: string | null
  name: string
  city: string
  province: string
  description: string | null
  sports: string[]
  contact_phone: string | null
  contact_email: string | null
  status: "pending" | "approved" | "rejected"
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

interface ListMeta {
  total: number
  page: number
  limit: number
}

// ──────────────────────────────────────────────────────────
// GET — list all club requests (admin only)
// Query params: status (pending|approved|rejected), page (1-based), limit
// ──────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ClubRequestWithRequester[]> & { meta?: ListMeta }>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get("status")
  const pageParam = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limitParam = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))

  const validStatuses = ["pending", "approved", "rejected"] as const
  type ValidStatus = (typeof validStatuses)[number]

  const statusFilter: ValidStatus | null =
    statusParam && (validStatuses as readonly string[]).includes(statusParam)
      ? (statusParam as ValidStatus)
      : null

  try {
    const supabase = await createServiceClient()

    // Build query with join to profiles for requester info
    let query = supabase
      .from("club_requests")
      .select(
        "id, user_id, name, city, province, description, sports, contact_phone, contact_email, status, admin_notes, reviewed_by, reviewed_at, created_at, updated_at, profiles!club_requests_user_id_fkey(full_name, username)",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range((pageParam - 1) * limitParam, pageParam * limitParam - 1)

    if (statusFilter) {
      query = query.eq("status", statusFilter)
    }

    const { data, error, count } = await query

    if (error) throw new Error(error.message)

    const requests: ClubRequestWithRequester[] = (data ?? []).map((row) => {
      const profile = row.profiles as { full_name?: string | null; username?: string | null } | null
      return {
        id: row.id,
        user_id: row.user_id,
        requester_full_name: profile?.full_name ?? null,
        requester_username: profile?.username ?? null,
        name: row.name,
        city: row.city,
        province: row.province,
        description: row.description ?? null,
        sports: row.sports ?? [],
        contact_phone: row.contact_phone ?? null,
        contact_email: row.contact_email ?? null,
        status: row.status as ClubRequestWithRequester["status"],
        admin_notes: row.admin_notes ?? null,
        reviewed_by: row.reviewed_by ?? null,
        reviewed_at: row.reviewed_at ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    })

    return NextResponse.json({
      success: true,
      data: requests,
      error: null,
      meta: {
        total: count ?? 0,
        page: pageParam,
        limit: limitParam,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[GET /api/admin/club-requests]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener las solicitudes" },
      { status: 500 }
    )
  }
}
