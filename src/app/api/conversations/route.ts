import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const postConversationSchema = z.object({
  recipientId: z.string().uuid("recipientId debe ser un UUID válido"),
  clubId: z.string().uuid("clubId debe ser un UUID válido"),
})

// ---------------------------------------------------------------------------
// GET /api/conversations — list authenticated user's conversations
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
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

  const { data, error } = await supabase
    .from("conversation_participants")
    .select(`
      conversation:conversations(
        id, type, title, club_id, updated_at,
        participants:conversation_participants(
          user:profiles(id, full_name, username, avatar_url)
        )
      )
    `)
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false })

  if (error) {
    console.error("[api/conversations] GET failed:", error.message)
    return NextResponse.json({ success: false, data: null, error: "Error al obtener conversaciones" }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: data?.map((row) => row.conversation) ?? [],
    error: null,
  })
}

// ---------------------------------------------------------------------------
// POST /api/conversations — create or retrieve DM between two club members
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

  const parsed = postConversationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { recipientId, clubId } = parsed.data

  if (recipientId === user.id) {
    return NextResponse.json({ success: false, data: null, error: "No puedes iniciar un chat contigo mismo" }, { status: 400 })
  }

  // Verify BOTH users are active club members (service client bypasses RLS)
  const service = createServiceClient()
  const { data: members, error: memberError } = await service
    .from("club_members")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .in("user_id", [user.id, recipientId])

  if (memberError) {
    console.error("[api/conversations] membership check failed:", memberError.message)
    return NextResponse.json({ success: false, data: null, error: "Error al verificar membresía" }, { status: 500 })
  }

  const memberIds = (members ?? []).map((m) => m.user_id)
  if (!memberIds.includes(user.id) || !memberIds.includes(recipientId)) {
    return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 })
  }

  // Idempotency: find an existing direct conversation between both users in this club
  const { data: existing, error: existingError } = await service
    .from("conversations")
    .select(`
      id,
      participants:conversation_participants!inner(user_id)
    `)
    .eq("club_id", clubId)
    .eq("type", "direct")

  if (existingError) {
    console.error("[api/conversations] existing conversation lookup failed:", existingError.message)
    return NextResponse.json({ success: false, data: null, error: "Error al buscar conversaciones existentes" }, { status: 500 })
  }

  // A valid DM has exactly the caller and the recipient as participants
  const match = (existing ?? []).find((conv) => {
    const participantIds = conv.participants.map((p: { user_id: string }) => p.user_id)
    return (
      participantIds.length === 2 &&
      participantIds.includes(user.id) &&
      participantIds.includes(recipientId)
    )
  })

  if (match) {
    return NextResponse.json({ success: true, data: { conversationId: match.id }, error: null })
  }

  // Create a new direct conversation — use user client so the insert passes RLS
  const { data: newConv, error: convError } = await supabase
    .from("conversations")
    .insert({ club_id: clubId, type: "direct", created_by: user.id })
    .select("id")
    .single()

  if (convError || !newConv) {
    console.error("[api/conversations] conversation insert failed:", convError?.message)
    return NextResponse.json({ success: false, data: null, error: "Error al crear la conversación" }, { status: 500 })
  }

  const { error: participantsError } = await supabase
    .from("conversation_participants")
    .insert([
      { conversation_id: newConv.id, user_id: user.id },
      { conversation_id: newConv.id, user_id: recipientId },
    ])

  if (participantsError) {
    console.error("[api/conversations] participants insert failed:", participantsError.message)
    // Attempt cleanup to avoid orphaned conversation
    await service.from("conversations").delete().eq("id", newConv.id)
    return NextResponse.json({ success: false, data: null, error: "Error al agregar participantes" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: { conversationId: newConv.id }, error: null }, { status: 201 })
}
