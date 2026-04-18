import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit"
import { z } from "zod"
import { ok, fail } from "@/lib/api/response"

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
    return fail("Demasiadas solicitudes. Intenta de nuevo en un momento.", 429)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return fail("Unauthorized", 401)
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
    return fail("Error al obtener conversaciones", 500)
  }

  return ok(data?.map((row) => row.conversation) ?? [])
}

// ---------------------------------------------------------------------------
// POST /api/conversations — create or retrieve DM between two club members
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rl = await checkRateLimit("messages", ip, RATE_LIMITS.messages)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta de nuevo en un momento.", 429)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return fail("Unauthorized", 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("JSON inválido")
  }

  const parsed = postConversationSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }
  const { recipientId, clubId } = parsed.data

  if (recipientId === user.id) {
    return fail("No puedes iniciar un chat contigo mismo")
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
    return fail("Error al verificar membresía", 500)
  }

  const memberIds = (members ?? []).map((m) => m.user_id)
  if (!memberIds.includes(user.id) || !memberIds.includes(recipientId)) {
    return fail("Forbidden", 403)
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
    return fail("Error al buscar conversaciones existentes", 500)
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
    return ok({ conversationId: match.id })
  }

  // Create a new direct conversation — use user client so the insert passes RLS
  const { data: newConv, error: convError } = await supabase
    .from("conversations")
    .insert({ club_id: clubId, type: "direct", created_by: user.id })
    .select("id")
    .single()

  if (convError || !newConv) {
    console.error("[api/conversations] conversation insert failed:", convError?.message)
    return fail("Error al crear la conversación", 500)
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
    return fail("Error al agregar participantes", 500)
  }

  return ok({ conversationId: newConv.id }, 201)
}
