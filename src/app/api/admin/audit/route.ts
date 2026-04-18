import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"
import { ok, fail } from "@/lib/api/response"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  actor_id: string | null
  actor_name: string | null
  details: Record<string, unknown>
  created_at: string
}

export interface AuditMeta {
  total: number
  page: number
  limit: number
}

// ── Query param schema ────────────────────────────────────────────────────────

const querySchema = z.object({
  actor_id: z.string().uuid("actor_id debe ser un UUID válido").optional(),
  action: z.string().max(100).optional(),
  entity_type: z.string().max(100).optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AuditLogEntry[]> & { meta?: AuditMeta }>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  const { searchParams } = request.nextUrl
  const rawParams = {
    actor_id: searchParams.get("actor_id") ?? undefined,
    action: searchParams.get("action") ?? undefined,
    entity_type: searchParams.get("entity_type") ?? undefined,
    from_date: searchParams.get("from_date") ?? undefined,
    to_date: searchParams.get("to_date") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  }

  const parsed = querySchema.safeParse(rawParams)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  const { actor_id: actorId, action, entity_type: entityType, from_date: fromDate, to_date: toDate, page, limit } = parsed.data
  const offset = (page - 1) * limit

  try {
    const supabase = createServiceClient()

    // Build count query
    let countQuery = supabase
      .from("audit_log")
      .select("id", { count: "exact", head: true })

    if (actorId) countQuery = countQuery.eq("actor_id", actorId)
    if (action) countQuery = countQuery.ilike("action", `%${action}%`)
    if (entityType) countQuery = countQuery.eq("entity_type", entityType)
    if (fromDate) countQuery = countQuery.gte("created_at", fromDate)
    if (toDate) countQuery = countQuery.lte("created_at", toDate)

    // Build data query — join profiles for actor name
    let dataQuery = supabase
      .from("audit_log")
      .select(
        "id, action, entity_type, entity_id, actor_id, details, created_at, profiles!audit_log_actor_id_fkey(full_name, first_name, last_name, username)"
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (actorId) dataQuery = dataQuery.eq("actor_id", actorId)
    if (action) dataQuery = dataQuery.ilike("action", `%${action}%`)
    if (entityType) dataQuery = dataQuery.eq("entity_type", entityType)
    if (fromDate) dataQuery = dataQuery.gte("created_at", fromDate)
    if (toDate) dataQuery = dataQuery.lte("created_at", toDate)

    const [countRes, dataRes] = await Promise.all([countQuery, dataQuery])

    if (countRes.error) throw new Error(countRes.error.message)
    if (dataRes.error) throw new Error(dataRes.error.message)

    const entries: AuditLogEntry[] = (dataRes.data ?? []).map((row) => {
      const profile = row.profiles as {
        full_name?: string | null
        first_name?: string | null
        last_name?: string | null
        username?: string | null
      } | null

      const actorName =
        profile?.full_name ||
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
        profile?.username ||
        null

      return {
        id: row.id,
        action: row.action,
        entity_type: row.entity_type ?? null,
        entity_id: row.entity_id ?? null,
        actor_id: row.actor_id ?? null,
        actor_name: actorName,
        details: (row.details as Record<string, unknown>) ?? {},
        created_at: row.created_at,
      }
    })

    return ok(entries)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[GET /api/admin/audit]", message)
    return fail("Error al obtener el audit log", 500)
  }
}
