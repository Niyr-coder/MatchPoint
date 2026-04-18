import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { CLUB_BADGE_TYPES } from "@/features/badges/constants"
import type { ApiResponse } from "@/types"
import type { PlayerBadge, RawBadgeRow } from "@/features/badges/types"
import type { BadgeType } from "@/features/badges/constants"
import { ok, fail } from "@/lib/api/response"

type RouteContext = { params: Promise<{ clubId: string; id: string }> }

const clubBadgeEnum = z.enum(CLUB_BADGE_TYPES as [BadgeType, ...BadgeType[]])
const grantSchema = z.object({ badge_type: clubBadgeEnum })

export async function POST(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<PlayerBadge>>> {
  const { clubId, id } = await params

  const authResult = await authorize({ clubId, requiredPermission: "club.edit" })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

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

  const { badge_type } = parsed.data
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("player_badges")
    .insert({
      user_id: id,
      badge_type,
      club_id: clubId,
      granted_by: authResult.context.userId,
    })
    .select("id, badge_type, club_id, granted_by, granted_at, clubs(name)")
    .single()

  if (error) {
    if (error.code === "23505") {
      return fail("El jugador ya tiene esta insignia en este club", 409)
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

  return ok(badge)
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<null>>> {
  const { clubId, id } = await params

  const authResult = await authorize({ clubId, requiredPermission: "club.edit" })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  const url = new URL(request.url)
  const badgeId = url.searchParams.get("badgeId")
  if (!badgeId) {
    return fail("badgeId requerido")
  }

  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from("player_badges")
    .select("id, badge_type")
    .eq("id", badgeId)
    .eq("user_id", id)
    .eq("club_id", clubId)
    .maybeSingle()

  if (!existing) {
    return fail("Insignia no encontrada", 404)
  }

  const { error } = await supabase.from("player_badges").delete().eq("id", badgeId)

  if (error) {
    return fail("Error al revocar insignia", 500)
  }

  return ok(null)
}
