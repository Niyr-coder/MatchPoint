import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const putSchema = z.object({
  name:             z.string().min(3, "El nombre debe tener al menos 3 caracteres").max(100).optional(),
  description:      z.string().max(1000).optional(),
  start_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida").optional(),
  start_time:       z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  end_date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  entry_fee:        z.number().min(0).optional(),
  max_participants: z.number().int().min(2).max(256).optional(),
  modality:         z.string().max(50).nullable().optional(),
})

const patchSchema = z.object({
  status: z.enum(["open", "in_progress", "completed", "cancelled"]),
  force:  z.boolean().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("tournaments")
    .select("*, clubs(name)")
    .eq("id", id)
    .single()

  if (error) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  return NextResponse.json({ success: true, data })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  let rawBody: unknown
  try { rawBody = await request.json() } catch {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 })
  }
  const parsed = putSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 422 })
  }
  const body = parsed.data

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("created_by, status")
    .eq("id", id)
    .single()

  if (!tournament || tournament.created_by !== user.id) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 })
  }

  if (["completed", "cancelled"].includes(tournament.status as string)) {
    return NextResponse.json({ success: false, error: "No se puede editar un torneo finalizado" }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name)                       updates.name             = body.name.trim()
  if (body.description !== undefined)  updates.description      = body.description
  if (body.start_date)                 updates.start_date       = body.start_date
  if (body.start_time !== undefined)   updates.start_time       = body.start_time ?? null
  if (body.end_date !== undefined)     updates.end_date         = body.end_date ?? null
  if (body.entry_fee !== undefined)    updates.entry_fee        = body.entry_fee
  if (body.max_participants !== undefined) updates.max_participants = body.max_participants
  if (body.modality !== undefined)     updates.modality         = body.modality ?? null

  const { data, error } = await supabase
    .from("tournaments")
    .update(updates)
    .eq("id", id)
    .eq("created_by", user.id)
    .select()
    .single()

  if (error || !data) return NextResponse.json({ success: false, error: "Error al actualizar" }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  let rawBody: unknown
  try { rawBody = await request.json() } catch {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 })
  }
  const parsedPatch = patchSchema.safeParse(rawBody)
  if (!parsedPatch.success) {
    return NextResponse.json({ success: false, error: parsedPatch.error.issues[0].message }, { status: 422 })
  }
  const { status, force = false } = parsedPatch.data

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("created_by, status")
    .eq("id", id)
    .single()

  if (!tournament || tournament.created_by !== user.id) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 })
  }

  // State machine: enforce valid transitions
  const validTransitions: Record<string, string[]> = {
    draft: ["open", "cancelled"],
    open: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  }
  const current = tournament.status as string
  if (!(validTransitions[current] ?? []).includes(status)) {
    return NextResponse.json({
      success: false,
      error: `No se puede cambiar de "${current}" a "${status}"`,
    }, { status: 409 })
  }

  const service = createServiceClient()

  // Guard: open → in_progress requires ≥ 4 participants and bracket generated
  if (status === "in_progress" && tournament.status === "open") {
    const { count: participantCount } = await service
      .from("tournament_participants")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", id)
      .neq("status", "withdrawn")

    if ((participantCount ?? 0) < 4) {
      return NextResponse.json({
        success: false,
        error: `Se necesitan al menos 4 participantes para iniciar. Actualmente hay ${participantCount ?? 0}.`,
      }, { status: 409 })
    }

    const { count: bracketCount } = await service
      .from("tournament_brackets")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", id)

    if ((bracketCount ?? 0) === 0) {
      return NextResponse.json({
        success: false,
        error: "Genera el bracket antes de iniciar el torneo.",
      }, { status: 409 })
    }
  }

  // Guard: in_progress → completed warns about incomplete matches (unless force)
  if (status === "completed" && tournament.status === "in_progress" && !force) {
    const { count: incompleteCount } = await service
      .from("tournament_brackets")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", id)
      .in("status", ["pending", "in_progress"])

    if ((incompleteCount ?? 0) > 0) {
      return NextResponse.json({
        success: false,
        error: `Hay ${incompleteCount} partido(s) sin resultado. ¿Deseas finalizar igualmente?`,
        requiresConfirmation: true,
        incompleteCount,
      }, { status: 409 })
    }
  }

  const { data, error } = await supabase
    .from("tournaments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("created_by", user.id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ success: false, error: "No encontrado o sin autorización" }, { status: 404 })
  }

  // On cancellation: auto-refund all paid participants
  if (status === "cancelled") {
    await service
      .from("tournament_participants")
      .update({ payment_status: "refunded" })
      .eq("tournament_id", id)
      .eq("payment_status", "paid")
  }

  return NextResponse.json({ success: true, data })
}
