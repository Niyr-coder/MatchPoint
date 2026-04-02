/**
 * /api/invites/[id]
 *
 * PATCH  — revoke an invite link (set is_active = false). Creator only.
 * DELETE — permanently delete an invite link. Creator only.
 *
 * Both operations verify ownership before touching the DB so that RLS is a
 * second line of defense, not the primary gate.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"
import type { InviteLink } from "@/lib/invites/join-handlers"

// ──────────────────────────────────────────────────────────────────────────────
// Shared ownership guard
//
// Fetches the invite by id using the service client (bypasses RLS), then
// checks that the authenticated user is the creator. Returns the invite row on
// success so callers don't need a second query.
// ──────────────────────────────────────────────────────────────────────────────

async function resolveOwnedInvite(
  inviteId: string,
  userId: string
): Promise<
  | { ok: true;  invite: InviteLink }
  | { ok: false; status: 401 | 403 | 404; error: string }
> {
  if (!inviteId.match(/^[0-9a-f-]{36}$/i)) {
    return { ok: false, status: 404, error: "Invitación no encontrada" }
  }

  const service = createServiceClient()

  const { data, error } = await service
    .from("invite_links")
    .select("*")
    .eq("id", inviteId)
    .maybeSingle()

  if (error) {
    console.error("[resolveOwnedInvite] DB error:", error.message)
    return { ok: false, status: 404, error: "Invitación no encontrada" }
  }

  if (!data) {
    return { ok: false, status: 404, error: "Invitación no encontrada" }
  }

  const invite = data as InviteLink

  if (invite.created_by !== userId) {
    return { ok: false, status: 403, error: "No tienes permiso para modificar esta invitación" }
  }

  return { ok: true, invite }
}

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/invites/[id] — revoke (is_active = false)
// ──────────────────────────────────────────────────────────────────────────────

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<InviteLink>>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { success: false, data: null, error: "No autenticado" },
      { status: 401 }
    )
  }

  const { id } = await params

  const ownership = await resolveOwnedInvite(id, user.id)
  if (!ownership.ok) {
    return NextResponse.json(
      { success: false, data: null, error: ownership.error },
      { status: ownership.status }
    )
  }

  // Guard: already revoked — return current state instead of a no-op write
  if (!ownership.invite.is_active) {
    return NextResponse.json(
      { success: true, data: ownership.invite, error: null }
    )
  }

  try {
    const service = createServiceClient()

    const { data, error: dbError } = await service
      .from("invite_links")
      .update({ is_active: false })
      .eq("id", id)
      .eq("created_by", user.id)   // redundant safety check at DB level
      .select("*")
      .single()

    if (dbError) throw new Error(dbError.message)

    return NextResponse.json({ success: true, data: data as InviteLink, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[PATCH /api/invites/${id}]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al revocar la invitación" },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/invites/[id] — permanent removal
// ──────────────────────────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { success: false, data: null, error: "No autenticado" },
      { status: 401 }
    )
  }

  const { id } = await params

  const ownership = await resolveOwnedInvite(id, user.id)
  if (!ownership.ok) {
    return NextResponse.json(
      { success: false, data: null, error: ownership.error },
      { status: ownership.status }
    )
  }

  try {
    const service = createServiceClient()

    const { error: dbError } = await service
      .from("invite_links")
      .delete()
      .eq("id", id)
      .eq("created_by", user.id)   // redundant safety check at DB level

    if (dbError) throw new Error(dbError.message)

    return NextResponse.json({ success: true, data: null, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[DELETE /api/invites/${id}]`, message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al eliminar la invitación" },
      { status: 500 }
    )
  }
}
