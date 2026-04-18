import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { logAdminAction } from "@/lib/audit/log"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import type { ApiResponse } from "@/types"
import { ok, fail } from "@/lib/api/response"

// ── types ──────────────────────────────────────────────────────────────────────

export type AnnouncementResult = {
  sent_to: number
}

export type AuditAnnouncement = {
  id: string
  actor_id: string
  details: {
    title: string
    target: string
    club_id?: string
    sent_to_count: number
  }
  created_at: string
}

// ── validation ─────────────────────────────────────────────────────────────────

const postSchema = z
  .object({
    title: z.string().min(1, "El título es requerido").max(200),
    message: z.string().min(1, "El mensaje es requerido").max(2000),
    target: z.enum(["all", "club"]),
    club_id: z.string().uuid("ID de club inválido").optional(),
  })
  .strict()
  .refine(
    (obj) => obj.target !== "club" || Boolean(obj.club_id),
    { message: "Se requiere club_id cuando target es 'club'", path: ["club_id"] }
  )

// ── GET /api/admin/announcements ───────────────────────────────────────────────

export async function GET(): Promise<NextResponse<ApiResponse<AuditAnnouncement[]>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("audit_log")
      .select("id, actor_id, details, created_at")
      .eq("action", "announcement.sent")
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) throw new Error(error.message)

    return ok((data ?? []) as AuditAnnouncement[])
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[announcements] GET failed:", message)
    return fail("Error al obtener anuncios", 500)
  }
}

// ── POST /api/admin/announcements ──────────────────────────────────────────────

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AnnouncementResult>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  const ctx = authResult.context
  const rl = await checkRateLimit("adminBulk", ctx.userId, RATE_LIMITS.adminBulk)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta más tarde.", 429)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Cuerpo de solicitud inválido")
  }

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  const { title, message, target, club_id } = parsed.data

  try {
    const supabase = createServiceClient()

    // Collect target user IDs
    let recipientIds: string[] = []

    if (target === "all") {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id")

      if (profilesError) throw new Error(profilesError.message)
      recipientIds = (profiles ?? []).map((p: { id: string }) => p.id)
    } else {
      // target === "club"
      const { data: members, error: membersError } = await supabase
        .from("club_members")
        .select("user_id")
        .eq("club_id", club_id!)
        .eq("is_active", true)

      if (membersError) throw new Error(membersError.message)
      recipientIds = (members ?? []).map((m: { user_id: string }) => m.user_id)
    }

    if (recipientIds.length === 0) {
      return ok({ sent_to: 0 })
    }

    // Bulk insert notifications
    const notifications = recipientIds.map((userId) => ({
      user_id: userId,
      type: "announcement" as const,
      title,
      body: message,
      read: false,
      metadata: { target, club_id: club_id ?? null } as Record<string, unknown>,
    }))

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications)

    if (insertError) throw new Error(insertError.message)

    await logAdminAction({
      action: "announcement.sent",
      entityType: "notification",
      actorId: authResult.context.userId,
      details: {
        title,
        target,
        club_id: club_id ?? null,
        sent_to_count: recipientIds.length,
      },
    })

    return ok({ sent_to: recipientIds.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[announcements] POST failed:", message)
    return fail("Error al enviar el anuncio", 500)
  }
}
