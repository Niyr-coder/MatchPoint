import { NextRequest, NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { logAdminAction } from "@/lib/audit/log"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import type { ApiResponse } from "@/types"
import { ok, fail } from "@/lib/api/response"

type RouteContext = { params: Promise<{ id: string; badgeId: string }> }

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<null>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  const ctx = authResult.context
  const rl = await checkRateLimit("adminBulk", ctx.userId, RATE_LIMITS.adminBulk)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta más tarde.", 429)
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
    return fail("Insignia no encontrada", 404)
  }

  const { error } = await supabase.from("player_badges").delete().eq("id", badgeId)

  if (error) {
    return fail("Error al revocar insignia", 500)
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

  return ok(null)
}
