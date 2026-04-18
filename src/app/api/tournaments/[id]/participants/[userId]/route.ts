import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { z } from "zod"
import { ok, fail } from "@/lib/api/response"

const VALID_PAYMENT_STATUS = ["pending", "paid", "refunded"] as const
const VALID_STATUS = ["registered", "confirmed", "withdrawn", "cancelled"] as const

const patchParticipantSchema = z.object({
  payment_status: z.enum(VALID_PAYMENT_STATUS).optional(),
  status: z.enum(VALID_STATUS).optional(),
  notes: z.string().max(500).nullable().optional(),
  seed: z.number().int().min(1).nullable().optional(),
  withdrawal_reason: z.string().max(500).nullable().optional(),
}).strict()

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail("Unauthorized", 401)

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("created_by")
    .eq("id", id)
    .single()

  if (!tournament || tournament.created_by !== user.id) {
    return fail("Forbidden", 403)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("JSON inválido")
  }

  const parsed = patchParticipantSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  if (Object.keys(parsed.data).length === 0) {
    return fail("No hay campos para actualizar")
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from("tournament_participants")
    .update(parsed.data)
    .eq("tournament_id", id)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) return fail(error.message, 500)
  return ok(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail("Unauthorized", 401)

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("created_by, status")
    .eq("id", id)
    .single()

  if (!tournament || tournament.created_by !== user.id) {
    return fail("Forbidden", 403)
  }

  const body = await request.json().catch(() => ({})) as { mode?: string; reason?: string }
  const mode = body.mode ?? (tournament.status === "in_progress" ? "withdraw" : "remove")
  const service = createServiceClient()

  if (mode === "withdraw") {
    // Mark as withdrawn — keep record and bracket history
    const { error } = await service
      .from("tournament_participants")
      .update({ status: "withdrawn", withdrawal_reason: body.reason ?? null })
      .eq("tournament_id", id)
      .eq("user_id", userId)

    if (error) return fail(error.message, 500)

    // Replace pending bracket slots with bye (preserve completed match history)
    const { data: matches } = await service
      .from("tournament_brackets")
      .select("id, player1_id, player2_id, status")
      .eq("tournament_id", id)
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)

    for (const match of matches ?? []) {
      if (match.status === "completed") continue
      const update: Record<string, unknown> = { status: "bye" }
      if (match.player1_id === userId) update.player1_id = null
      if (match.player2_id === userId) update.player2_id = null
      await service.from("tournament_brackets").update(update).eq("id", match.id)
    }

    return ok({ mode: "withdrawn" })
  }

  // Hard remove — pre-tournament only
  const { error } = await service
    .from("tournament_participants")
    .delete()
    .eq("tournament_id", id)
    .eq("user_id", userId)

  if (error) return fail(error.message, 500)
  return ok({ mode: "removed" })
}
