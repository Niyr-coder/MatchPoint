import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const broadcastSchema = z.object({
  clubId: z.string().uuid("clubId debe ser un UUID válido"),
  title: z.string().min(1, "El título no puede estar vacío").max(200, "El título no puede superar 200 caracteres").trim(),
  content: z.string().min(1, "El contenido no puede estar vacío").max(2000, "El contenido no puede superar 2000 caracteres").trim(),
})

// Roles with broadcast permission (owner, manager) — plus global admin checked separately
const BROADCAST_ROLES = ["owner", "manager"] as const

// ---------------------------------------------------------------------------
// POST /api/conversations/broadcast — send announcement to all active club members
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rl = await checkRateLimit("messages", ip, RATE_LIMITS.messages)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes. Intenta de nuevo en un momento." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfterSeconds),
          "X-RateLimit-Limit": String(RATE_LIMITS.messages.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)),
        },
      }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, data: null, error: "JSON inválido" }, { status: 400 })
  }

  const parsed = broadcastSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { clubId, title, content } = parsed.data

  const service = createServiceClient()

  // Authorization: check global_role=admin OR club role is owner/manager
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("global_role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    console.error("[api/conversations/broadcast] profile fetch failed:", profileError?.message)
    return NextResponse.json({ success: false, data: null, error: "Error al verificar permisos" }, { status: 500 })
  }

  const isGlobalAdmin = profile.global_role === "admin"

  if (!isGlobalAdmin) {
    const { data: clubMember, error: memberError } = await service
      .from("club_members")
      .select("role")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()

    if (memberError) {
      console.error("[api/conversations/broadcast] membership check failed:", memberError.message)
      return NextResponse.json({ success: false, data: null, error: "Error al verificar membresía" }, { status: 500 })
    }

    const hasPermission = clubMember && (BROADCAST_ROLES as readonly string[]).includes(clubMember.role)
    if (!hasPermission) {
      return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 })
    }
  }

  // 1. Create broadcast conversation
  const { data: conversation, error: convError } = await service
    .from("conversations")
    .insert({ club_id: clubId, type: "broadcast", title, created_by: user.id })
    .select("id")
    .single()

  if (convError || !conversation) {
    console.error("[api/conversations/broadcast] conversation insert failed:", convError?.message)
    return NextResponse.json({ success: false, data: null, error: "Error al crear el anuncio" }, { status: 500 })
  }

  const conversationId = conversation.id

  // 2. Fetch all active member IDs in the club
  const { data: members, error: membersError } = await service
    .from("club_members")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("is_active", true)

  if (membersError) {
    console.error("[api/conversations/broadcast] members fetch failed:", membersError.message)
    // Rollback conversation to avoid orphan
    await service.from("conversations").delete().eq("id", conversationId)
    return NextResponse.json({ success: false, data: null, error: "Error al obtener miembros del club" }, { status: 500 })
  }

  // 3. Batch insert all members as participants
  const participantRows = (members ?? []).map((m) => ({
    conversation_id: conversationId,
    user_id: m.user_id,
  }))

  if (participantRows.length > 0) {
    const { error: participantsError } = await service
      .from("conversation_participants")
      .insert(participantRows)

    if (participantsError) {
      console.error("[api/conversations/broadcast] participants insert failed:", participantsError.message)
      await service.from("conversations").delete().eq("id", conversationId)
      return NextResponse.json({ success: false, data: null, error: "Error al agregar participantes" }, { status: 500 })
    }
  }

  // 4. Insert the first message (the announcement body)
  const { error: messageError } = await service
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, content: content.trim() })

  if (messageError) {
    console.error("[api/conversations/broadcast] message insert failed:", messageError.message)
    // Participants and conversation already created — log but don't roll back;
    // the conversation exists without a message, which is recoverable
    return NextResponse.json({ success: false, data: null, error: "Error al enviar el mensaje del anuncio" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: { conversationId }, error: null }, { status: 201 })
}
