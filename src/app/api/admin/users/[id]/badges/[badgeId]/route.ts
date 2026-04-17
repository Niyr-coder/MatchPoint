import { NextRequest, NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { logAdminAction } from "@/lib/audit/log"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import type { ApiResponse } from "@/types"

type RouteContext = { params: Promise<{ id: string; badgeId: string }> }

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<null>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json({ success: false, data: null, error: "No autorizado" }, { status: 403 })
  }

  const ctx = authResult.context
  const rl = await checkRateLimit("adminBulk", ctx.userId, RATE_LIMITS.adminBulk)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }

  const { id, badgeId } = await params
  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from("player_badges")
    .select("id, badge_type, club_id")
    .eq("id", badgeId)
    .eq("user_id", id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ success: false, data: null, error: "Insignia no encontrada" }, { status: 404 })
  }

  const { error } = await supabase.from("player_badges").delete().eq("id", badgeId)

  if (error) {
    return NextResponse.json({ success: false, data: null, error: "Error al revocar insignia" }, { status: 500 })
  }

  await logAdminAction({
    action: "badge.revoked",
    entityType: "users",
    entityId: id,
    actorId: authResult.context.userId,
    details: {
      badge_type: (existing as { badge_type: string }).badge_type,
      club_id: (existing as { club_id: string | null }).club_id,
    },
  })

  return NextResponse.json({ success: true, data: null, error: null })
}
