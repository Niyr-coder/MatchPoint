import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get("conversationId")

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (conversationId) {
    // Verify user is a member of this conversation before reading messages
    const { data: membership } = await supabase
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data, error } = await supabase
      .from("messages")
      .select("*, sender:profiles(id, full_name, username, avatar_url)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ messages: data ?? [] })
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

  if (error) return NextResponse.json({ conversations: [] })
  return NextResponse.json({ conversations: data?.map((d) => d.conversation) ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json() as { conversationId?: string; content?: string }
  const { conversationId, content } = body

  if (!conversationId || !content?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  if (content.trim().length > 2000) {
    return NextResponse.json({ error: "El mensaje no puede superar 2000 caracteres" }, { status: 400 })
  }

  // Verify user is a participant in this conversation before sending
  const { data: membership } = await supabase
    .from("conversation_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, content: content.trim() })
    .select("*, sender:profiles(id, full_name, username, avatar_url)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update conversation updated_at
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId)

  return NextResponse.json({ message: data })
}
