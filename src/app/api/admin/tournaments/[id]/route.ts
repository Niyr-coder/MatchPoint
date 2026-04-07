import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { logAdminAction } from "@/lib/audit/log"
import type { ApiResponse } from "@/types"

interface TournamentWithClub {
  id: string
  name: string
  sport: string
  status: string
  club_id: string | null
  max_participants: number | null
  entry_fee: number
  start_date: string
  end_date: string | null
  modality: string | null
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
  club_name: string | null
}

// All fields optional — send only the ones to update
const updateTournamentSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres").max(100).optional(),
  sport: z
    .enum(["futbol", "padel", "tenis", "pickleball"], {
      message: "Deporte inválido",
    })
    .optional(),
  clubId: z.string().uuid("ID de club inválido").optional(),
  maxParticipants: z.number().int().min(2).max(256).optional(),
  entryFee: z.number().min(0).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate debe tener formato YYYY-MM-DD").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  modality: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
})

// Statuses that are immutable — no edits allowed
const TERMINAL_STATUSES = ["completed", "cancelled"] as const

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<TournamentWithClub>>> {
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
      { success: false, data: null, error: "ID de torneo requerido" },
      { status: 400 }
    )
  }

  try {
    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from("tournaments")
      .select("*, clubs(name)")
      .eq("id", id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) {
      return NextResponse.json(
        { success: false, data: null, error: "Torneo no encontrado" },
        { status: 404 }
      )
    }

    const tournament: TournamentWithClub = {
      id: data.id,
      name: data.name,
      sport: data.sport,
      status: data.status,
      club_id: data.club_id ?? null,
      max_participants: data.max_participants ?? null,
      entry_fee: Number(data.entry_fee) || 0,
      start_date: data.start_date,
      end_date: data.end_date ?? null,
      modality: data.modality ?? null,
      description: data.description ?? null,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
      club_name: (data.clubs as { name?: string } | null)?.name ?? null,
    }

    return NextResponse.json({ success: true, data: tournament, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[GET /api/admin/tournaments/${id}]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener el torneo" },
      { status: 500 }
    )
  }
}

export async function PUT(
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
      { success: false, data: null, error: "ID de torneo requerido" },
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

  const parsed = updateTournamentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { success: false, data: null, error: "No se enviaron campos para actualizar" },
      { status: 422 }
    )
  }

  try {
    const supabase = await createServiceClient()

    const { data: existing, error: fetchError } = await supabase
      .from("tournaments")
      .select("id, status")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) throw new Error(fetchError.message)
    if (!existing) {
      return NextResponse.json(
        { success: false, data: null, error: "Torneo no encontrado" },
        { status: 404 }
      )
    }

    if ((TERMINAL_STATUSES as readonly string[]).includes(existing.status as string)) {
      return NextResponse.json(
        { success: false, data: null, error: "No se puede editar un torneo completado o cancelado" },
        { status: 400 }
      )
    }

    // Map camelCase input fields to snake_case DB columns
    const d = parsed.data
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (d.name !== undefined)           updates.name             = d.name.trim()
    if (d.sport !== undefined)          updates.sport            = d.sport
    if (d.clubId !== undefined)         updates.club_id          = d.clubId
    if (d.maxParticipants !== undefined) updates.max_participants = d.maxParticipants
    if (d.entryFee !== undefined)       updates.entry_fee        = d.entryFee
    if (d.startDate !== undefined)      updates.start_date       = d.startDate
    if (d.endDate !== undefined)        updates.end_date         = d.endDate
    if (d.modality !== undefined)       updates.modality         = d.modality
    if (d.description !== undefined)    updates.description      = d.description

    const { error: updateError } = await supabase
      .from("tournaments")
      .update(updates)
      .eq("id", id)

    if (updateError) throw new Error(updateError.message)

    await logAdminAction({
      action: "tournament.updated",
      entityType: "tournaments",
      entityId: id,
      actorId: authResult.context.userId,
      details: { fields: Object.keys(d).filter((k) => d[k as keyof typeof d] !== undefined) },
    })

    return NextResponse.json({ success: true, data: null, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[PUT /api/admin/tournaments/${id}]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al actualizar el torneo" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
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
      { success: false, data: null, error: "ID de torneo requerido" },
      { status: 400 }
    )
  }

  try {
    const supabase = await createServiceClient()

    const { data: existing, error: fetchError } = await supabase
      .from("tournaments")
      .select("id, status")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) throw new Error(fetchError.message)
    if (!existing) {
      return NextResponse.json(
        { success: false, data: null, error: "Torneo no encontrado" },
        { status: 404 }
      )
    }

    if (existing.status === "draft") {
      // Draft tournaments are safe to hard-delete — no participants or history to preserve
      const { error: deleteError } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", id)

      if (deleteError) throw new Error(deleteError.message)
    } else {
      // Non-draft tournaments (open, in_progress, completed, cancelled) are soft-cancelled
      // to preserve participant history and bracket data
      const { error: cancelError } = await supabase
        .from("tournaments")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id)

      if (cancelError) throw new Error(cancelError.message)
    }

    await logAdminAction({
      action: existing.status === "draft" ? "tournament.deleted" : "tournament.cancelled",
      entityType: "tournaments",
      entityId: id,
      actorId: authResult.context.userId,
      details: { previousStatus: existing.status },
    })

    return NextResponse.json({ success: true, data: null, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[DELETE /api/admin/tournaments/${id}]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al eliminar el torneo" },
      { status: 500 }
    )
  }
}
