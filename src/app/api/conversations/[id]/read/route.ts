import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { ok, fail } from "@/lib/api/response"

// ---------------------------------------------------------------------------
// POST /api/conversations/[id]/read — mark a conversation as read for the caller
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params

  if (!conversationId) {
    return fail("conversationId requerido")
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return fail("Unauthorized", 401)
  }

  const rl = await checkRateLimit("conversationsMarkRead", user.id, RATE_LIMITS.conversationsMarkRead)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes", 429)
  }

  // Update last_read_at only for the participant row that belongs to this user.
  // RLS on conversation_participants ensures only the owner of the row can update it.
  const { error } = await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)

  if (error) {
    console.error("[api/conversations/[id]/read] update failed:", error.message)
    return fail("Error al marcar como leída", 500)
  }

  return ok(null)
}
