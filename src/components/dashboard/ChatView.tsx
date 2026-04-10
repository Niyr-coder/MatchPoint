"use client"

import { useState, useEffect, useRef } from "react"
import { Send, MessageSquare, Users } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"

interface MessageSender {
  id: string
  full_name: string
  username: string
  avatar_url: string | null
}

interface Message {
  id: string
  content: string
  sender: MessageSender
  created_at: string
}

interface ConversationParticipant {
  user: MessageSender
}

interface Conversation {
  id: string
  type: string
  title: string | null
  updated_at: string
  participants: ConversationParticipant[]
}

interface ChatViewProps {
  userId: string
}

function getConversationName(conv: Conversation, currentUserId: string): string {
  if (conv.title) return conv.title
  const others = conv.participants
    .filter((p) => p.user.id !== currentUserId)
    .map((p) => p.user.full_name)
    .filter(Boolean)
  return others.length > 0 ? others.join(", ") : "Conversación"
}

export function ChatView({ userId }: ChatViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchConversations = () => {
    fetch("/api/messages")
      .then((r) => r.json())
      .then((d: { data?: Conversation[] }) => setConversations(d.data ?? []))
      .catch(() => setConversations([]))
  }

  useEffect(() => {
    setLoadingConvs(true)
    fetch("/api/messages")
      .then((r) => r.json())
      .then((d: { data?: Conversation[] }) => setConversations(d.data ?? []))
      .catch(() => setConversations([]))
      .finally(() => setLoadingConvs(false))

    // Auto-refresh conversations list every 10s
    const convPollId = setInterval(fetchConversations, 10000)
    return () => clearInterval(convPollId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!activeConv) return

    // Clear stale messages when switching conversations
    setMessages([])

    let currentController: AbortController | null = null

    const load = () => {
      currentController?.abort()
      currentController = new AbortController()
      fetch(`/api/messages?conversationId=${activeConv}`, { signal: currentController.signal })
        .then((r) => r.json())
        .then((d: { data?: Message[] }) => setMessages(d.data ?? []))
        .catch((err: unknown) => {
          if (!(err instanceof Error && err.name === "AbortError")) {
            setSendError("Error al cargar mensajes. Intenta de nuevo.")
            setTimeout(() => setSendError(null), 4000)
          }
        })
    }

    load()
    pollRef.current = setInterval(load, 5000)
    return () => {
      currentController?.abort()
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [activeConv])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || !activeConv || sending) return

    setSending(true)
    setSendError(null)
    const tempContent = input
    setInput("")

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConv, content: tempContent }),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? "Error al enviar el mensaje")
      }

      const [msgRes, convRes] = await Promise.all([
        fetch(`/api/messages?conversationId=${activeConv}`),
        fetch("/api/messages"),
      ])
      const msgData = (await msgRes.json()) as { data?: Message[] }
      const convData = (await convRes.json()) as { data?: Conversation[] }
      setMessages(msgData.data ?? [])
      setConversations(convData.data ?? [])
    } catch (err) {
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

  const activeConvData = conversations.find((c) => c.id === activeConv)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="MENSAJES"
        title="Chat"
        description="Comunicación con tu club"
      />

      <div
        className="flex gap-0 border border-[#e5e5e5] rounded-2xl overflow-hidden bg-white"
        style={{ minHeight: "520px" }}
      >
        {/* Conversation list */}
        <div className="w-72 shrink-0 border-r border-[#e5e5e5] flex flex-col">
          <div className="p-4 border-b border-[#e5e5e5]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Conversaciones
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex flex-col gap-2 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                    <div className="size-9 rounded-full bg-zinc-100 shrink-0 animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-zinc-100 rounded-full w-3/4 animate-pulse" />
                      <div className="h-2.5 bg-zinc-100 rounded-full w-1/2 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
                <MessageSquare className="size-8 text-zinc-200" />
                <p className="text-xs font-bold text-zinc-400">Sin conversaciones</p>
                <p className="text-[10px] text-zinc-300 leading-relaxed">
                  Los administradores de tu club pueden iniciarte una conversación
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
                    className={`w-full p-4 text-left border-b border-[#f0f0f0] transition-colors ${
                      isActive
                        ? "bg-zinc-50"
                        : "hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
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
              <div className="size-14 rounded-2xl bg-zinc-50 flex items-center justify-center">
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
                <div className="px-4 py-3 border-b border-[#e5e5e5] flex items-center gap-3">
                  <div className="size-8 rounded-full bg-zinc-100 flex items-center justify-center">
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
                    const initials = msg.sender.full_name?.[0]?.toUpperCase() ?? "?"
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <div className="size-7 rounded-full bg-zinc-200 shrink-0 flex items-center justify-center text-[10px] font-black text-zinc-600">
                          {initials}
                        </div>
                        <div
                          className={`max-w-xs rounded-2xl px-3.5 py-2 ${
                            isOwn
                              ? "bg-[#0a0a0a] text-white rounded-tr-sm"
                              : "bg-zinc-100 text-zinc-800 rounded-tl-sm"
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
              <div className="p-4 border-t border-[#e5e5e5] flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe un mensaje..."
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 bg-zinc-100 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0a0a0a] focus:bg-white transition-all disabled:opacity-50"
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || sending}
                  className="size-10 rounded-xl bg-[#0a0a0a] text-white flex items-center justify-center hover:bg-[#222222] transition-colors disabled:opacity-40 shrink-0"
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
