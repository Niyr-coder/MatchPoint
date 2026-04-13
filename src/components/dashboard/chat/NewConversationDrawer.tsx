"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { ClubMember } from "@/features/chat/types"

interface NewConversationDrawerProps {
  clubId: string
  currentUserId: string
  onConversationCreated: (convId: string) => void
  children: React.ReactNode
}

interface CreateConversationResponse {
  success?: boolean
  data?: { conversationId?: string }
  error?: string
}

function getRoleBadgeClass(role: string): string {
  const lower = role.toLowerCase()
  if (lower === "owner") return "bg-zinc-900 text-white"
  if (lower === "manager") return "bg-zinc-700 text-white"
  if (lower === "coach") return "bg-green-100 text-green-700"
  if (lower === "partner") return "bg-blue-100 text-blue-700"
  return "bg-zinc-100 text-zinc-600"
}

export function NewConversationDrawer({
  clubId,
  currentUserId,
  onConversationCreated,
  children,
}: NewConversationDrawerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [members, setMembers] = useState<ClubMember[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`/api/clubs/${clubId}/members`)
      if (!res.ok) {
        const d = (await res.json()) as { error?: string }
        throw new Error(d.error ?? "Error al cargar miembros")
      }
      const d = (await res.json()) as { data?: ClubMember[] }
      setMembers(d.data ?? [])
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Error al cargar miembros")
    } finally {
      setLoading(false)
    }
  }, [clubId])

  useEffect(() => {
    if (open) {
      void fetchMembers()
    } else {
      setSearch("")
      setFetchError(null)
    }
  }, [open, fetchMembers])

  const filteredMembers = members.filter((m) => {
    if (m.userId === currentUserId) return false
    const q = search.toLowerCase()
    return (
      m.fullName.toLowerCase().includes(q) ||
      m.username.toLowerCase().includes(q)
    )
  })

  const handleSelectMember = async (member: ClubMember) => {
    if (creating) return
    setCreating(member.userId)
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: member.userId, clubId }),
      })
      const d = (await res.json()) as CreateConversationResponse
      if (!res.ok) {
        throw new Error(d.error ?? "Error al crear conversación")
      }
      const convId = d.data?.conversationId
      if (!convId) throw new Error("No se recibió ID de conversación")
      setOpen(false)
      onConversationCreated(convId)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Error al crear conversación")
    } finally {
      setCreating(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>{children}</SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Nueva conversación</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 pb-4 flex-1 overflow-hidden">
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar miembro..."
            className="w-full px-3 py-2 bg-muted rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-foreground transition-all"
          />

          {/* Error */}
          {fetchError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-xs text-red-600">{fetchError}</p>
            </div>
          )}

          {/* Member list */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-1">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl"
                >
                  <div className="size-9 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-muted rounded-full w-2/3 animate-pulse" />
                    <div className="h-2.5 bg-muted rounded-full w-1/3 animate-pulse" />
                  </div>
                </div>
              ))
            ) : filteredMembers.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-8">
                {search ? "Sin resultados" : "No hay miembros en este club"}
              </p>
            ) : (
              filteredMembers.map((member) => {
                const initial = member.fullName?.[0]?.toUpperCase() ?? "?"
                const isCreating = creating === member.userId
                return (
                  <button
                    key={member.userId}
                    onClick={() => void handleSelectMember(member)}
                    disabled={!!creating}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-secondary transition-colors text-left w-full disabled:opacity-50"
                  >
                    <div className="size-9 rounded-full bg-zinc-200 flex items-center justify-center shrink-0 text-sm font-black text-zinc-600">
                      {isCreating ? (
                        <span className="size-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        initial
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-zinc-800 truncate">
                        {member.fullName}
                      </p>
                      <p className="text-[10px] text-zinc-400 truncate">
                        @{member.username}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md shrink-0 ${getRoleBadgeClass(member.role)}`}
                    >
                      {member.role}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
