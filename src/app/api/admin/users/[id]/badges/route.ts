import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { logAdminAction } from "@/lib/audit/log"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { BADGE_TYPES, BADGE_CONFIG } from "@/features/badges/constants"
import type { ApiResponse } from "@/types"
import type { PlayerBadge, RawBadgeRow } from "@/features/badges/types"
import type { BadgeType } from "@/features/badges/constants"
import { ok, fail } from "@/lib/api/response"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<PlayerBadge[]>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("player_badges")
    .select("id, badge_type, club_id, granted_by, granted_at, clubs(name)")
    .eq("user_id", id)
    .order("granted_at", { ascending: false })

  if (error) {
    return fail("Error al obtener insignias", 500)
  }

  const badges: PlayerBadge[] = (data as unknown as RawBadgeRow[]).map((row) => ({
    id: row.id,
    badge_type: row.badge_type as BadgeType,
    club_id: row.club_id,
    club_name: row.clubs?.name ?? null,
    granted_by: row.granted_by,
    granted_at: row.granted_at,
  }))

  return ok(badges)
}

const grantSchema = z.object({
  badge_type: z.enum(BADGE_TYPES),
  club_id: z.string().uuid().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<PlayerBadge>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  const ctx = authResult.context
  const rl = await checkRateLimit("adminBulk", ctx.userId, RATE_LIMITS.adminBulk)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta más tarde.", 429)
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Cuerpo inválido")
  }

  const parsed = grantSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  const { badge_type, club_id } = parsed.data
  const config = BADGE_CONFIG[badge_type]
  const resolvedClubId = config.canBeClubScoped ? (club_id ?? null) : null

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("player_badges")
    .insert({
      user_id: id,
      badge_type,
      club_id: resolvedClubId,
      granted_by: authResult.context.userId,
    })
    .select("id, badge_type, club_id, granted_by, granted_at, clubs(name)")
    .single()

  if (error) {
    if (error.code === "23505") {
      return fail("El jugador ya tiene esta insignia", 409)
    }
    return fail("Error al otorgar insignia", 500)
  }

  const row = data as unknown as RawBadgeRow
  const badge: PlayerBadge = {
    id: row.id,
    badge_type: row.badge_type as BadgeType,
    club_id: row.club_id,
    club_name: row.clubs?.name ?? null,
    granted_by: row.granted_by,
    granted_at: row.granted_at,
  }

  await logAdminAction({
    action: "badge.granted",
    entityType: "users",
    entityId: id,
    actorId: authResult.context.userId,
    details: { badge_type, club_id: resolvedClubId },
  })

  return ok(badge)
}
