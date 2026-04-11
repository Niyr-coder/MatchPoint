"use client"

import { useState, useCallback } from "react"
import { Copy, Check, UserMinus, LogOut, Pencil, X } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { SPORT_LABELS } from "@/lib/sports/config"

interface TeamMember {
  id: string
  user_id: string
  role: "captain" | "member"
  profile: {
    id: string
    full_name: string | null
    username: string | null
    avatar_url: string | null
  }
}

interface Team {
  id: string
  name: string
  sport: string
  description: string | null
  invite_code: string
  members: TeamMember[]
}

interface TeamViewProps {
  team: Team
  currentUserId: string
  onLeft: () => void
}

function MemberAvatar({ member }: { member: TeamMember }) {
  const name = member.profile.full_name ?? member.profile.username ?? "?"
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")

  if (member.profile.avatar_url) {
    return (
      <img
        src={member.profile.avatar_url}
        alt={name}
        className="size-9 rounded-full object-cover bg-muted"
      />
    )
  }
  return (
    <div className="size-9 rounded-full bg-foreground flex items-center justify-center text-white text-xs font-black shrink-0">
      {initials || "?"}
    </div>
  )
}

interface EditFormState {
  name: string
  description: string
}

export function TeamView({ team, currentUserId, onLeft }: TeamViewProps) {
  const [copied, setCopied] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditFormState>({
    name: team.name,
    description: team.description ?? "",
  })
  const [localTeam, setLocalTeam] = useState<Team>(team)

  const currentMember = localTeam.members.find((m) => m.profile.id === currentUserId)
  const isCaptain = currentMember?.role === "captain"

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(localTeam.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select text
    }
  }, [localTeam.invite_code])

  async function handleSaveEdit() {
    const trimmedName = editForm.name.trim()
    if (!trimmedName) {
      setError("El nombre del team es obligatorio.")
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/teams/${localTeam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: editForm.description.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Error al guardar los cambios.")
        return
      }
      setLocalTeam((prev) => ({
        ...prev,
        name: trimmedName,
        description: editForm.description.trim() || null,
      }))
      setIsEditing(false)
    } catch {
      setError("Error de red. Intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLeave() {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/teams/${localTeam.id}/members/${currentUserId}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Error al abandonar el team.")
        setConfirmLeave(false)
        return
      }
      onLeft()
    } catch {
      setError("Error de red. Intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRemoveMember(memberId: string) {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/teams/${localTeam.id}/members/${memberId}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Error al eliminar miembro.")
        setConfirmRemove(null)
        return
      }
      setLocalTeam((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.profile.id !== memberId),
      }))
      setConfirmRemove(null)
    } catch {
      setError("Error de red. Intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const sportLabel = SPORT_LABELS[localTeam.sport as keyof typeof SPORT_LABELS] ?? localTeam.sport

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wide text-zinc-400 block mb-1">
                    Nombre del team
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    maxLength={60}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wide text-zinc-400 block mb-1">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={2}
                    maxLength={200}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 resize-none"
                  />
                </div>
                {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSubmitting}
                    className="bg-foreground text-white rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wide disabled:opacity-50"
                  >
                    {isSubmitting ? "Guardando..." : "Guardar"}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setEditForm({ name: localTeam.name, description: localTeam.description ?? "" })
                      setError(null)
                    }}
                    className="px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wide text-zinc-500 hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-black tracking-tight text-foreground truncate">
                  {localTeam.name}
                </h1>
                <span className="inline-block mt-1.5 text-[10px] font-black uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-foreground text-white">
                  {sportLabel}
                </span>
                {localTeam.description && (
                  <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                    {localTeam.description}
                  </p>
                )}
              </>
            )}
          </div>
          {isCaptain && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 rounded-full text-zinc-400 hover:text-foreground hover:bg-muted transition-colors shrink-0"
              aria-label="Editar team"
            >
              <Pencil className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Invite code card */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-3">
          Código de invitación
        </p>
        <div className="flex items-center gap-3">
          <span className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm font-black text-foreground tracking-widest select-all">
            {localTeam.invite_code}
          </span>
          <button
            onClick={copyCode}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[11px] font-black uppercase tracking-wide transition-colors shrink-0",
              copied
                ? "bg-green-600 text-white"
                : "bg-foreground text-white hover:bg-foreground/90"
            )}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>

      {/* Members card */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-4">
          Miembros · {localTeam.members.length}
        </p>
        <ul className="space-y-2">
          {localTeam.members.map((m) => {
            const memberName = m.profile.full_name ?? m.profile.username ?? "Sin nombre"
            const isCurrentUser = m.profile.id === currentUserId
            return (
              <li
                key={m.id}
                className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <Link
                  href={`/dashboard/players/${m.profile.username ?? m.user_id}`}
                  tabIndex={-1}
                  className="shrink-0"
                >
                  <MemberAvatar member={m} />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/dashboard/players/${m.profile.username ?? m.user_id}`}
                    className="text-sm font-bold text-foreground truncate hover:underline underline-offset-2 block"
                  >
                    {memberName}
                    {isCurrentUser && (
                      <span className="ml-1.5 text-[10px] font-black text-zinc-300">(tú)</span>
                    )}
                  </Link>
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full",
                      m.role === "captain"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-muted text-zinc-500"
                    )}
                  >
                    {m.role === "captain" ? "Capitán" : "Miembro"}
                  </span>
                </div>

                {/* Captain can remove other members */}
                {isCaptain && !isCurrentUser && (
                  confirmRemove === m.profile.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRemoveMember(m.profile.id)}
                        disabled={isSubmitting}
                        className="text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full bg-red-500 text-white disabled:opacity-50"
                      >
                        {isSubmitting ? "..." : "Eliminar"}
                      </button>
                      <button
                        onClick={() => setConfirmRemove(null)}
                        className="p-1 rounded-full text-zinc-400 hover:text-foreground transition-colors"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRemove(m.profile.id)}
                      className="p-1.5 rounded-full text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                      aria-label={`Eliminar a ${memberName}`}
                    >
                      <UserMinus className="size-4" />
                    </button>
                  )
                )}
              </li>
            )
          })}
        </ul>

        {/* Global error display (outside edit mode) */}
        {error && !isEditing && (
          <p className="mt-3 text-xs font-semibold text-red-500">{error}</p>
        )}
      </div>

      {/* Leave team — only for non-captain members */}
      {!isCaptain && (
        <div className="flex justify-end">
          {confirmLeave ? (
            <div className="flex items-center gap-3 rounded-2xl bg-card border border-red-200 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                ¿Abandonar <span className="font-black">{localTeam.name}</span>?
              </p>
              <button
                onClick={handleLeave}
                disabled={isSubmitting}
                className="bg-red-500 text-white rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wide disabled:opacity-50"
              >
                {isSubmitting ? "..." : "Sí, salir"}
              </button>
              <button
                onClick={() => setConfirmLeave(false)}
                className="px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wide text-zinc-500 hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmLeave(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-[11px] font-black uppercase tracking-wide text-zinc-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              <LogOut className="size-3.5" />
              Abandonar team
            </button>
          )}
        </div>
      )}
    </div>
  )
}
