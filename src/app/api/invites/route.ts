/**
 * /api/invites
 *
 * GET  ?entity_type=X&entity_id=Y  — list invite links for an entity
 * POST (body)                       — create a new invite link
 *
 * Authorization matrix:
 *   GET  — creator of the link, or club role >= MANAGER for club entities
 *   POST — role requirement depends on entity_type (see REQUIRED_ROLES_BY_TYPE)
 *
 * Rate limit (POST): 20 invites per hour per user (keyed by userId, not IP,
 * so VPN/proxy changes cannot bypass the quota).
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { authorize } from "@/lib/auth/authorization"
import { checkRateLimit } from "@/lib/rate-limit"
import type { ApiResponse, AppRole } from "@/types"
import type { InviteEntityType, InviteLink } from "@/lib/invites/join-handlers"

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const RATE_LIMIT_CREATE_INVITES = { limit: 20, windowMs: 60 * 60 * 1_000 } as const

/** Minimum club role required to create invites per entity type */
const REQUIRED_ROLES_BY_TYPE: Record<InviteEntityType, AppRole[]> = {
  club:        ["owner", "manager", "admin"],
  tournament:  ["owner", "manager", "coach", "admin"],
  team:        ["owner", "manager", "coach", "admin"],
  event:       ["owner", "manager", "admin"],
  coach_class: ["coach", "owner", "manager", "admin"],
  reservation: ["owner", "manager", "employee", "coach", "admin"],
}

/** Minimum club role required to list another user's invites for an entity */
const MIN_LIST_ROLE: AppRole[] = ["manager", "owner", "admin"]

const ENTITY_TYPES: [InviteEntityType, ...InviteEntityType[]] = [
  "club",
  "tournament",
  "team",
  "event",
  "coach_class",
  "reservation",
]

// ──────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ──────────────────────────────────────────────────────────────────────────────

const createInviteSchema = z.object({
  entity_type: z.enum(ENTITY_TYPES),
  entity_id:   z.string().uuid("entity_id debe ser un UUID válido"),
  max_uses:    z.number().int().min(1).optional(),
  expires_at:  z.iso.datetime().optional(),
  metadata:    z.record(z.string(), z.unknown()).optional(),
})

const listQuerySchema = z.object({
  entity_type: z.enum(ENTITY_TYPES),
  entity_id:   z.string().uuid("entity_id debe ser un UUID válido"),
})

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * For club-scoped entity types the caller must have the required role in that
 * club.  For non-club entity types (tournament, team, etc.) we still require
 * the user to be authenticated and have a profile — we skip the club-role
 * check since those entities are not always tied to a specific club.
 *
 * entity_id doubles as the club_id only for entity_type === 'club'.
 */
async function checkCreatePermission(
  entityType: InviteEntityType,
  entityId: string
): Promise<{ ok: true; userId: string } | { ok: false; status: 401 | 403; error: string }> {
  const clubId = entityType === "club" ? entityId : null
  const requiredRoles = REQUIRED_ROLES_BY_TYPE[entityType]

  const result = await authorize({
    clubId,
    requiredRoles: clubId ? requiredRoles : undefined,
  })

  if (!result.ok) {
    const isUnauthenticated = result.reason === "not_authenticated"
    return {
      ok: false,
      status: isUnauthenticated ? 401 : 403,
      error: isUnauthenticated ? "No autenticado" : "No tienes permiso para crear invitaciones de este tipo",
    }
  }

  return { ok: true, userId: result.context.userId }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/invites?entity_type=X&entity_id=Y
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<InviteLink[]>>> {
  // 1. Auth check (light — just needs a session)
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { success: false, data: null, error: "No autenticado" },
      { status: 401 }
    )
  }

  // 2. Validate query params
  const rawParams = {
    entity_type: request.nextUrl.searchParams.get("entity_type"),
    entity_id:   request.nextUrl.searchParams.get("entity_id"),
  }

  const parsed = listQuerySchema.safeParse(rawParams)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  const { entity_type, entity_id } = parsed.data

  try {
    const service = createServiceClient()

    // 3. Authorization: the user can always see their own links.
    //    To see all links for a club entity, they need MIN_LIST_ROLE.
    //    We run the club-role check only for club-type entities; for others
    //    (tournament, team, etc.) we only show the user's own links unless
    //    they are global admin.
    let canSeeAll = false

    if (entity_type === "club") {
      const authResult = await authorize({
        clubId: entity_id,
        requiredRoles: MIN_LIST_ROLE,
      })
      canSeeAll = authResult.ok
    } else {
      // Check if global admin
      const authResult = await authorize({ requiredRoles: ["admin"] })
      canSeeAll = authResult.ok
    }

    const query = service
      .from("invite_links")
      .select("*")
      .eq("entity_type", entity_type)
      .eq("entity_id", entity_id)
      .order("created_at", { ascending: false })

    // If not privileged, restrict to own links
    const finalQuery = canSeeAll ? query : query.eq("created_by", user.id)

    const { data, error: dbError } = await finalQuery

    if (dbError) throw new Error(dbError.message)

    return NextResponse.json({ success: true, data: (data ?? []) as InviteLink[], error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[GET /api/invites]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener las invitaciones" },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/invites
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<InviteLink>>> {
  // 1. Parse body first so we can extract entity_type for permission check
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Cuerpo de solicitud inválido" },
      { status: 400 }
    )
  }

  const parsed = createInviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  const { entity_type, entity_id, max_uses, expires_at, metadata } = parsed.data

  // 2. Authorization (also resolves userId)
  const permCheck = await checkCreatePermission(entity_type, entity_id)
  if (!permCheck.ok) {
    return NextResponse.json(
      { success: false, data: null, error: permCheck.error },
      { status: permCheck.status }
    )
  }

  const { userId } = permCheck

  // 3. Rate limit — keyed by userId (not IP) so proxy changes are irrelevant
  const rl = await checkRateLimit(
    "invites_create",
    userId,
    RATE_LIMIT_CREATE_INVITES
  )

  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Has creado demasiadas invitaciones. Intenta de nuevo en unos minutos." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfterSeconds),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rl.resetAt),
        },
      }
    )
  }

  // 4. Insert
  try {
    const service = createServiceClient()

    const { data, error: dbError } = await service
      .from("invite_links")
      .insert({
        entity_type,
        entity_id,
        created_by: userId,
        max_uses:   max_uses ?? null,
        expires_at: expires_at ?? null,
        metadata:   metadata ?? {},
      })
      .select("*")
      .single()

    if (dbError) throw new Error(dbError.message)

    return NextResponse.json(
      { success: true, data: data as InviteLink, error: null },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[POST /api/invites]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al crear la invitación" },
      { status: 500 }
    )
  }
}
