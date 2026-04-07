import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { logAdminAction } from "@/lib/audit/log"
import type { ApiResponse } from "@/types"

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface ClubRequestRow {
  id: string
  user_id: string
  name: string
  city: string
  province: string
  description: string | null
  sports: string[]
  status: string
}

// ──────────────────────────────────────────────────────────
// Validation schema
// ──────────────────────────────────────────────────────────

const patchSchema = z.object({
  action: z.enum(["approve", "reject"], {
    message: "La acción debe ser 'approve' o 'reject'",
  }),
  adminNotes: z.string().nullish(),
})

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

/**
 * Generates a URL-safe slug from an arbitrary string.
 * Appends a short random suffix to avoid unique-constraint collisions.
 */
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)

  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base}-${suffix}`
}

type RouteContext = { params: Promise<{ id: string }> }

// ──────────────────────────────────────────────────────────
// PATCH — approve or reject a club request (admin only)
// ──────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<null>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json(
      { success: false, data: null, error: "ID de solicitud requerido" },
      { status: 400 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Cuerpo de solicitud inválido" },
      { status: 400 }
    )
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  const { action, adminNotes } = parsed.data

  try {
    const supabase = await createServiceClient()
    const now = new Date().toISOString()
    const reviewerId = authResult.context.userId

    // Fetch the request to validate it exists and is still pending
    const { data: clubRequest, error: fetchError } = await supabase
      .from("club_requests")
      .select("id, user_id, name, city, province, description, sports, status")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) throw new Error(fetchError.message)
    if (!clubRequest) {
      return NextResponse.json(
        { success: false, data: null, error: "Solicitud no encontrada" },
        { status: 404 }
      )
    }

    const req = clubRequest as ClubRequestRow

    if (req.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: `Esta solicitud ya fue ${req.status === "approved" ? "aprobada" : "rechazada"}`,
        },
        { status: 409 }
      )
    }

    if (action === "reject") {
      const { error: updateError } = await supabase
        .from("club_requests")
        .update({
          status: "rejected",
          admin_notes: adminNotes ?? null,
          reviewed_by: reviewerId,
          reviewed_at: now,
          updated_at: now,
        })
        .eq("id", id)

      if (updateError) throw new Error(updateError.message)

      // Fire-and-forget notification — must not fail the main operation
      try {
        await supabase.from("notifications").insert({
          user_id: req.user_id,
          type: "club_request_rejected",
          title: "Solicitud de club no aprobada",
          body: adminNotes
            ? `Tu solicitud para "${req.name}" no fue aprobada. Motivo: ${adminNotes}`
            : `Tu solicitud para "${req.name}" no fue aprobada en esta ocasión. Puedes enviar una nueva solicitud.`,
          metadata: { club_name: req.name },
        })
      } catch (notifErr) {
        console.error(`[PATCH /api/admin/club-requests/${id}] notification insert failed (reject)`, notifErr)
      }

      await logAdminAction({
        action: "club_request.rejected",
        entityType: "club_requests",
        entityId: id,
        actorId: reviewerId,
        details: { requestedClubName: req.name, userId: req.user_id },
      })

      return NextResponse.json({ success: true, data: null, error: null })
    }

    // action === "approve"
    // Step 1 — create the club
    const { data: newClub, error: clubError } = await supabase
      .from("clubs")
      .insert({
        name: req.name,
        slug: generateSlug(req.name),
        city: req.city,
        province: req.province,
        description: req.description ?? null,
        is_active: true,
        created_by: req.user_id,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single()

    if (clubError) throw new Error(clubError.message)

    // Step 2 — assign the requester as owner in club_members
    const { error: memberError } = await supabase
      .from("club_members")
      .insert({
        user_id: req.user_id,
        club_id: newClub.id,
        role: "owner",
        is_active: true,
        joined_at: now,
        updated_at: now,
      })

    if (memberError) throw new Error(memberError.message)

    // Step 3 — mark the request as approved
    const { error: updateError } = await supabase
      .from("club_requests")
      .update({
        status: "approved",
        admin_notes: adminNotes ?? null,
        reviewed_by: reviewerId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", id)

    if (updateError) throw new Error(updateError.message)

    // Fire-and-forget notification — must not fail the main operation
    try {
      await supabase.from("notifications").insert({
        user_id: req.user_id,
        type: "club_request_approved",
        title: "¡Tu solicitud de club fue aprobada! 🎉",
        body: `Tu solicitud para crear "${req.name}" ha sido aprobada. Ya puedes administrar tu club desde el panel de Owner.`,
        metadata: { club_id: newClub.id, club_name: req.name },
      })
    } catch (notifErr) {
      console.error(`[PATCH /api/admin/club-requests/${id}] notification insert failed (approve)`, notifErr)
    }

    await logAdminAction({
      action: "club_request.approved",
      entityType: "club_requests",
      entityId: id,
      actorId: reviewerId,
      details: { requestedClubName: req.name, newClubId: newClub.id, userId: req.user_id },
    })

    return NextResponse.json({ success: true, data: null, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[PATCH /api/admin/club-requests/${id}]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al procesar la solicitud" },
      { status: 500 }
    )
  }
}
