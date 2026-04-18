import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit"
import { z } from "zod"
import { ok, fail } from "@/lib/api/response"

const getMessagesSchema = z.object({
  conversationId: z.string().uuid("conversationId debe ser un UUID válido").optional(),
})

const postMessageSchema = z.object({
  conversationId: z.string().uuid("conversationId inválido"),
  content: z.string().min(1, "El mensaje no puede estar vacío").max(2000, "El mensaje no puede superar 2000 caracteres").trim(),
})

export async function GET(request: Request) {
  const ip = getClientIp(request)
  const rl = await checkRateLimit("messages", ip, RATE_LIMITS.messages)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta de nuevo en un momento.", 429)
  }

  const { searchParams } = new URL(request.url)
  const parsed = getMessagesSchema.safeParse({ conversationId: searchParams.get("conversationId") ?? undefined })
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }
  const { conversationId } = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail("Unauthorized", 401)

  if (conversationId) {
    // Verify user is a member of this conversation before reading messages
    const { data: membership } = await supabase
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!membership) {
      return fail("Forbidden", 403)
    }

    const { data, error } = await supabase
      .from("messages")
      .select("*, sender:profiles(id, full_name, username, avatar_url)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(50)

    if (error) return fail(error.message, 500)
    return ok(data ?? [])
  }

  // Get user's conversations with participants
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

  if (error) return fail(error.message, 500)
  return ok(data?.map((d) => d.conversation) ?? [])
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rl = await checkRateLimit("messages", ip, RATE_LIMITS.messages)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta de nuevo en un momento.", 429)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail("Unauthorized", 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("JSON inválido")
  }

  const parsed = postMessageSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }
  const { conversationId, content } = parsed.data

  // Verify user is a participant in this conversation before sending
  const { data: membership } = await supabase
    .from("conversation_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!membership) {
    return fail("Forbidden", 403)
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, content: content.trim() })
    .select("*, sender:profiles(id, full_name, username, avatar_url)")
    .single()

  if (error) return fail(error.message, 500)

  // Update conversation updated_at
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId)

  return ok(data)
}
