import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { CLUB_BADGE_TYPES } from "@/features/badges/constants"
import type { ApiResponse } from "@/types"
import type { PlayerBadge } from "@/features/badges/types"
import type { BadgeType } from "@/features/badges/constants"

type RouteContext = { params: Promise<{ clubId: string; id: string }> }

interface RawBadgeRow {
  id: string
  badge_type: string
  club_id: string | null
  granted_by: string
  granted_at: string
  clubs: { name: string } | null
}

const clubBadgeEnum = z.enum(CLUB_BADGE_TYPES as [BadgeType, ...BadgeType[]])
const grantSchema = z.object({ badge_type: clubBadgeEnum })

export async function POST(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<PlayerBadge>>> {
  const { clubId, id } = await params

  const authResult = await authorize({ clubId, requiredPermission: "club.edit" })
  if (!authResult.ok) {
    return NextResponse.json({ success: false, data: null, error: "No autorizado" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Cuerpo inválido" }, { status: 400 })
  }

  const parsed = grantSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: parsed.error.issues[0].message }, { status: 422 })
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
      return NextResponse.json(
        { success: false, data: null, error: "El jugador ya tiene esta insignia en este club" },
        { status: 409 }
      )
    }
    return NextResponse.json({ success: false, data: null, error: "Error al otorgar insignia" }, { status: 500 })
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

  return NextResponse.json({ success: true, data: badge, error: null })
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<null>>> {
  const { clubId, id } = await params

  const authResult = await authorize({ clubId, requiredPermission: "club.edit" })
  if (!authResult.ok) {
    return NextResponse.json({ success: false, data: null, error: "No autorizado" }, { status: 403 })
  }

  const url = new URL(request.url)
  const badgeId = url.searchParams.get("badgeId")
  if (!badgeId) {
    return NextResponse.json({ success: false, data: null, error: "badgeId requerido" }, { status: 400 })
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
    return NextResponse.json({ success: false, data: null, error: "Insignia no encontrada" }, { status: 404 })
  }

  const { error } = await supabase.from("player_badges").delete().eq("id", badgeId)

  if (error) {
    return NextResponse.json({ success: false, data: null, error: "Error al revocar insignia" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: null, error: null })
}
