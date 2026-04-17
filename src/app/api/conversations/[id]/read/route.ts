import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"

// ---------------------------------------------------------------------------
// POST /api/conversations/[id]/read — mark a conversation as read for the caller
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params

  if (!conversationId) {
    return NextResponse.json({ success: false, data: null, error: "conversationId requerido" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 })
  }

  const rl = await checkRateLimit("conversationsMarkRead", user.id, RATE_LIMITS.conversationsMarkRead)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
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
    return NextResponse.json({ success: false, data: null, error: "Error al marcar como leída" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: null, error: null })
}
