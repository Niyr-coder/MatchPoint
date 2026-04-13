"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Send, MessageSquare, Users, Plus, Megaphone, X } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { createClient } from "@/lib/supabase/client"
import type { Message, Conversation } from "@/features/chat/types"
import { NewConversationDrawer } from "@/components/dashboard/chat/NewConversationDrawer"
import { BroadcastForm } from "@/components/dashboard/chat/BroadcastForm"

interface ChatViewProps {
  userId: string
  clubId?: string | null
  canBroadcast?: boolean
}

function getConversationName(conv: Conversation, currentUserId: string): string {
  if (conv.title) return conv.title
  const others = conv.participants
    .filter((p) => p.user.id !== currentUserId)
    .map((p) => p.user.full_name)
    .filter(Boolean)
  return others.length > 0 ? others.join(", ") : "Conversación"
}

export function ChatView({ userId, clubId, canBroadcast = false }: ChatViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [showBroadcast, setShowBroadcast] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  // ── fetch helpers ──────────────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    try {
      const r = await fetch("/api/conversations")
      if (!r.ok) {
        const d = (await r.json()) as { error?: string }
        throw new Error(d.error ?? `Error ${r.status}`)
      }
      const d = (await r.json()) as { data?: Conversation[] }
      setConversations(d.data ?? [])
      setFetchError(null)
    } catch (err) {
      console.error("[ChatView] fetchConversations:", err)
      setFetchError(err instanceof Error ? err.message : "Error al cargar conversaciones")
    }
  }, [])

  const fetchMessages = useCallback(async (convId: string) => {
    try {
      const r = await fetch(`/api/conversations?conversationId=${convId}`)
      if (!r.ok) {
        const d = (await r.json()) as { error?: string }
        throw new Error(d.error ?? `Error ${r.status}`)
      }
      const d = (await r.json()) as { data?: Message[] }
      setMessages(d.data ?? [])
    } catch (err) {
      console.error("[ChatView] fetchMessages:", err)
    }
  }, [])

  // ── initial conversation list load ─────────────────────────────────────────

  useEffect(() => {
    setLoadingConvs(true)
    void fetchConversations().finally(() => setLoadingConvs(false))
  }, [fetchConversations])

  // ── Realtime: notify when user is added to a new conversation ─────────────

  useEffect(() => {
    const channel = supabase
      .channel("user-conversation-participants")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_participants",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void fetchConversations()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, fetchConversations, supabase])

  // ── messages load + Realtime subscription (active conversation) ────────────

  useEffect(() => {
    if (!activeConv) return

    setMessages([])
    void fetchMessages(activeConv)

    const channel = supabase
      .channel(`messages-conv-${activeConv}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConv}`,
        },
        () => {
          // Debounce to avoid burst re-fetches
          if (realtimeDebounceRef.current) {
            clearTimeout(realtimeDebounceRef.current)
          }
          realtimeDebounceRef.current = setTimeout(() => {
            void fetchMessages(activeConv)
            void fetchConversations()
          }, 200)
        }
      )
      .subscribe()

    return () => {
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current)
      }
      void supabase.removeChannel(channel)
    }
  }, [activeConv, fetchMessages, fetchConversations, supabase])

  // ── auto-scroll on new messages ────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── send message ───────────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!input.trim() || !activeConv || sending) return

    setSending(true)
    setSendError(null)
    const tempContent = input
    setInput("")

    // Optimistic UI: append temp message immediately
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      content: tempContent,
      sender: { id: userId, full_name: "Tú", username: "", avatar_url: null },
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempMsg])

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConv, content: tempContent }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? "Error al enviar el mensaje")
      }

      // Realtime will fire and reload messages, replacing the temp message.
      void fetchConversations()
    } catch (err) {
      // Remove optimistic message and restore input on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id))
      setInput(tempContent)
      setSendError(err instanceof Error ? err.message : "Error al enviar el mensaje")
      setTimeout(() => setSendError(null), 4000)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  const handleConversationCreated = (convId: string) => {
    void fetchConversations()
    setActiveConv(convId)
  }

  const activeConvData = conversations.find((c) => c.id === activeConv)

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="MENSAJES"
        title="Chat"
        description="Comunicación con tu club"
        action={
          canBroadcast && clubId ? (
            <button
              onClick={() => setShowBroadcast((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-white text-xs font-bold uppercase tracking-[0.1em] hover:bg-foreground/90 transition-colors"
            >
              <Megaphone className="size-3.5" />
              Anuncio
            </button>
          ) : undefined
        }
      />

      {/* Broadcast panel */}
      {showBroadcast && clubId && (
        <div className="border border-border rounded-2xl bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Nuevo anuncio
            </p>
            <button
              onClick={() => setShowBroadcast(false)}
              className="size-6 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
              aria-label="Cerrar"
            >
              <X className="size-3.5 text-zinc-400" />
            </button>
          </div>
          <BroadcastForm
            clubId={clubId}
            onSuccess={() => {
              setShowBroadcast(false)
              void fetchConversations()
            }}
          />
        </div>
      )}

      <div
        className="flex gap-0 border border-border rounded-2xl overflow-hidden bg-card"
        style={{ minHeight: "520px" }}
      >
        {/* Conversation list */}
        <div className="w-72 shrink-0 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Conversaciones
            </p>
            {clubId && (
              <NewConversationDrawer
                clubId={clubId}
                currentUserId={userId}
                onConversationCreated={handleConversationCreated}
              >
                <span
                  className="size-6 rounded-lg flex items-center justify-center bg-foreground text-white hover:bg-foreground/90 transition-colors cursor-pointer"
                  title="Nuevo chat"
                >
                  <Plus className="size-3.5" />
                </span>
              </NewConversationDrawer>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {fetchError ? (
              <div className="m-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5">
                <p className="text-xs text-red-600">{fetchError}</p>
              </div>
            ) : loadingConvs ? (
              <div className="flex flex-col gap-2 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                    <div className="size-9 rounded-full bg-muted shrink-0 animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-muted rounded-full w-3/4 animate-pulse" />
                      <div className="h-2.5 bg-muted rounded-full w-1/2 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
                <MessageSquare className="size-8 text-zinc-200" />
                <p className="text-xs font-bold text-zinc-400">Sin conversaciones</p>
                <p className="text-[10px] text-zinc-300 leading-relaxed">
                  {clubId
                    ? "Inicia una conversación con un miembro de tu club usando el botón de arriba"
                    : "No tienes conversaciones activas"}
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = activeConv === conv.id
                const name = getConversationName(conv, userId)
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConv(conv.id)}
                    className={`w-full p-4 text-left border-b border-border-subtle transition-colors ${
                      isActive ? "bg-secondary" : "hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Users className="size-4 text-zinc-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zinc-800 truncate">{name}</p>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wide mt-0.5">
                          {conv.type === "broadcast" ? "Difusión" : "Directo"}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Message area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="size-14 rounded-2xl bg-secondary flex items-center justify-center">
                <MessageSquare className="size-7 text-zinc-300" />
              </div>
              <p className="text-sm font-bold text-zinc-400">Selecciona una conversación</p>
              <p className="text-xs text-zinc-300 max-w-xs leading-relaxed">
                Elige una conversación del panel izquierdo para ver los mensajes
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              {activeConvData && (
                <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                  <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                    <Users className="size-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-800">
                      {getConversationName(activeConvData, userId)}
                    </p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide">
                      {activeConvData.type === "broadcast" ? "Difusión" : "Mensaje directo"}
                    </p>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center">
                    <p className="text-xs text-zinc-300">Sé el primero en escribir un mensaje</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender.id === userId
                    const isTemp = msg.id.startsWith("temp-")
                    const initials = msg.sender.full_name?.[0]?.toUpperCase() ?? "?"
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"} ${isTemp ? "opacity-60" : ""}`}
                      >
                        <div className="size-7 rounded-full bg-zinc-200 shrink-0 flex items-center justify-center text-[10px] font-black text-zinc-600">
                          {initials}
                        </div>
                        <div
                          className={`max-w-xs rounded-2xl px-3.5 py-2 ${
                            isOwn
                              ? "bg-foreground text-white rounded-tr-sm"
                              : "bg-muted text-zinc-800 rounded-tl-sm"
                          }`}
                        >
                          {!isOwn && (
                            <p className="text-[10px] font-bold text-zinc-500 mb-0.5">
                              {msg.sender.full_name ?? msg.sender.username}
                            </p>
                          )}
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              isOwn ? "text-zinc-300" : "text-zinc-400"
                            }`}
                          >
                            {new Date(msg.created_at).toLocaleTimeString("es-EC", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Send error */}
              {sendError && (
                <div className="px-4 py-2 bg-red-50 border-t border-red-200">
                  <p className="text-xs text-red-600">{sendError}</p>
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t border-border flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe un mensaje..."
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 bg-muted rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-foreground focus:bg-card transition-all disabled:opacity-50"
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || sending}
                  className="size-10 rounded-xl bg-foreground text-white flex items-center justify-center hover:bg-foreground/90 transition-colors disabled:opacity-40 shrink-0"
                  aria-label="Enviar mensaje"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
