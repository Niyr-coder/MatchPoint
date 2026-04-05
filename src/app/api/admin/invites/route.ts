import { NextRequest, NextResponse } from "next/server"
import { authorize } from "@/lib/auth/authorization"
import { createServiceClient } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"

const PAGE_SIZE = 20

export interface InviteLinkAdmin {
  id: string
  code: string
  entity_type: string
  entity_id: string
  created_by: string
  creator_name: string | null
  creator_email: string | null
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  is_active: boolean
  metadata: Record<string, unknown>
  created_at: string
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<InviteLinkAdmin[]>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  const { searchParams } = request.nextUrl
  const entityType = searchParams.get("entity_type") ?? undefined
  const isActiveParam = searchParams.get("is_active")
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"))
  const offset = (page - 1) * PAGE_SIZE

  try {
    const supabase = createServiceClient()
    let query = supabase
      .from("invite_links")
      .select(
        `
        id,
        code,
        entity_type,
        entity_id,
        created_by,
        max_uses,
        uses_count,
        expires_at,
        is_active,
        metadata,
        created_at,
        profiles:created_by (
          full_name,
          email
        )
        `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (entityType) {
      query = query.eq("entity_type", entityType)
    }

    if (isActiveParam !== null && isActiveParam !== "") {
      query = query.eq("is_active", isActiveParam === "true")
    }

    const { data, error, count } = await query

    if (error) throw new Error(error.message)

    const rows: InviteLinkAdmin[] = (data ?? []).map((row) => {
      const profile = Array.isArray(row.profiles)
        ? row.profiles[0]
        : row.profiles
      return {
        id: row.id as string,
        code: row.code as string,
        entity_type: row.entity_type as string,
        entity_id: row.entity_id as string,
        created_by: row.created_by as string,
        creator_name: (profile as { full_name?: string | null } | null)?.full_name ?? null,
        creator_email: (profile as { email?: string | null } | null)?.email ?? null,
        max_uses: row.max_uses as number | null,
        uses_count: row.uses_count as number,
        expires_at: row.expires_at as string | null,
        is_active: row.is_active as boolean,
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        created_at: row.created_at as string,
      }
    })

    return NextResponse.json({
      success: true,
      data: rows,
      error: null,
      meta: {
        total: count ?? 0,
        page,
        limit: PAGE_SIZE,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[GET /api/admin/invites]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener los invite links" },
      { status: 500 }
    )
  }
}

// ── POST /api/admin/invites ───────────────────────────────────────────────────

interface CreateInviteBody {
  entity_type: string
  entity_id: string
  max_uses?: number | null
  expires_at?: string | null
  metadata?: Record<string, unknown>
}

interface CreatedInvite {
  id: string
  code: string
  invite_url: string
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<CreatedInvite>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  let body: CreateInviteBody
  try {
    body = (await request.json()) as CreateInviteBody
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Cuerpo de la solicitud inválido" },
      { status: 400 }
    )
  }

  const { entity_type, entity_id, max_uses, expires_at, metadata } = body

  if (!entity_type || !entity_id) {
    return NextResponse.json(
      { success: false, data: null, error: "entity_type y entity_id son requeridos" },
      { status: 400 }
    )
  }

  try {
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from("invite_links")
      .insert({
        entity_type,
        entity_id,
        created_by: authResult.context.userId,
        max_uses: max_uses ?? null,
        expires_at: expires_at ?? null,
        metadata: metadata ?? {},
        is_active: true,
        uses_count: 0,
      })
      .select("id, code")
      .single()

    if (error) throw new Error(error.message)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://matchpoint.top"
    const created: CreatedInvite = {
      id: data.id as string,
      code: data.code as string,
      invite_url: `${baseUrl}/invite/${data.code as string}`,
    }

    return NextResponse.json({ success: true, data: created, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[POST /api/admin/invites]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al crear el invite link" },
      { status: 500 }
    )
  }
}
