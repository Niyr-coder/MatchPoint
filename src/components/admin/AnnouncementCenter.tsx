"use client"

import { useState, useTransition, useEffect } from "react"
import { Megaphone, Send, Users, Building2, ChevronDown, Clock, CheckCircle2 } from "lucide-react"
import type { AuditAnnouncement } from "@/app/api/admin/announcements/route"

// ── types ──────────────────────────────────────────────────────────────────────

interface Club {
  id: string
  name: string
}

// ── helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ── announcement form ──────────────────────────────────────────────────────────

interface AnnouncementFormProps {
  clubs: Club[]
  onSent: (sentTo: number) => void
}

function AnnouncementForm({ clubs, onSent }: AnnouncementFormProps) {
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [target, setTarget] = useState<"all" | "club">("all")
  const [selectedClubId, setSelectedClubId] = useState("")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)

  function validate(): string | null {
    if (title.trim().length < 1) return "El título es requerido."
    if (message.trim().length < 1) return "El mensaje es requerido."
    if (target === "club" && !selectedClubId) return "Selecciona un club para este anuncio."
    return null
  }

  function handleSubmit() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    if (!confirm) {
      setConfirm(true)
      return
    }
    sendAnnouncement()
  }

  function sendAnnouncement() {
    startTransition(async () => {
      setError(null)
      setConfirm(false)
      try {
        const body: Record<string, unknown> = { title: title.trim(), message: message.trim(), target }
        if (target === "club") body.club_id = selectedClubId

        const res = await fetch("/api/admin/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const json = await res.json()
        if (!res.ok || !json.success) {
          setError(json.error ?? "Error al enviar el anuncio")
          return
        }
        setTitle("")
        setMessage("")
        setTarget("all")
        setSelectedClubId("")
        onSent(json.data?.sent_to ?? 0)
      } catch {
        setError("Error de red al enviar el anuncio")
      }
    })
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="size-10 rounded-xl bg-[#dc2626]/10 flex items-center justify-center">
          <Megaphone className="size-5 text-[#dc2626]" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            Nuevo anuncio
          </p>
          <p className="text-lg font-black text-foreground leading-none mt-0.5">Enviar Anuncio</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Title */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 block mb-1.5">
            Título
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Mantenimiento programado el viernes"
            maxLength={200}
            className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground
              placeholder:text-zinc-400 focus:outline-none focus:border-foreground transition-colors"
          />
        </div>

        {/* Message */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 block mb-1.5">
            Mensaje
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe el mensaje completo del anuncio..."
            rows={4}
            maxLength={2000}
            className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground
              placeholder:text-zinc-400 focus:outline-none focus:border-foreground transition-colors resize-none"
          />
          <p className="text-[10px] text-zinc-400 mt-1 text-right">{message.length}/2000</p>
        </div>

        {/* Target */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 block mb-2">
            Destinatarios
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setTarget("all")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-black transition-colors
                ${target === "all"
                  ? "border-foreground bg-foreground text-white"
                  : "border-border bg-card text-zinc-600 hover:border-zinc-400"
                }`}
            >
              <Users className="size-3.5" />
              Todos los usuarios
            </button>
            <button
              onClick={() => setTarget("club")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-black transition-colors
                ${target === "club"
                  ? "border-foreground bg-foreground text-white"
                  : "border-border bg-card text-zinc-600 hover:border-zinc-400"
                }`}
            >
              <Building2 className="size-3.5" />
              Un club específico
            </button>
          </div>
        </div>

        {/* Club selector */}
        {target === "club" && (
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 block mb-1.5">
              Seleccionar club
            </label>
            <div className="relative">
              <select
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground
                  focus:outline-none focus:border-foreground transition-colors appearance-none pr-8"
              >
                <option value="">Selecciona un club...</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="size-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

        {error && <p className="text-xs font-bold text-red-600">{error}</p>}

        {confirm && (
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-sm font-bold text-amber-800 flex-1">
              Confirmas enviar este anuncio{target === "all" ? " a todos los usuarios" : " al club seleccionado"}?
            </p>
            <button
              onClick={() => setConfirm(false)}
              className="text-xs font-black text-zinc-500 hover:text-zinc-700"
            >
              Cancelar
            </button>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="btn-pill flex items-center gap-2 bg-foreground text-white px-6 py-2.5 text-sm font-black
              disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <span className="size-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            {confirm ? "Confirmar envío" : "Enviar anuncio"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── sent banner ────────────────────────────────────────────────────────────────

function SentBanner({ sentTo, onClose }: { sentTo: number; onClose: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
      <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
      <p className="text-sm font-black text-emerald-800 flex-1">
        Anuncio enviado a <span className="text-emerald-600">{sentTo} usuarios</span> correctamente.
      </p>
      <button onClick={onClose} className="text-xs font-black text-zinc-500 hover:text-zinc-700">
        Cerrar
      </button>
    </div>
  )
}

// ── announcements list ─────────────────────────────────────────────────────────

interface AnnouncementsListProps {
  announcements: AuditAnnouncement[]
  loading: boolean
}

function AnnouncementsList({ announcements, loading }: AnnouncementsListProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-16 rounded-xl bg-zinc-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (announcements.length === 0) {
    return (
      <div className="py-10 text-center">
        <Megaphone className="size-8 text-zinc-300 mx-auto mb-3" />
        <p className="text-sm font-bold text-zinc-500">No hay anuncios enviados aún.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-border-subtle">
      {announcements.map((item) => (
        <div key={item.id} className="py-3.5 flex items-start gap-3">
          <div className="size-8 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
            <Megaphone className="size-4 text-zinc-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-foreground truncate">
              {item.details?.title ?? "Sin título"}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                <Clock className="size-3" />
                {formatDate(item.created_at)}
              </span>
              {item.details?.target && (
                <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full
                  ${item.details.target === "all"
                    ? "bg-[#f0fdf4] text-primary"
                    : "bg-violet-50 text-violet-700"
                  }`}>
                  {item.details.target === "all" ? "Todos" : "Club"}
                </span>
              )}
              {item.details?.sent_to_count !== undefined && (
                <span className="text-[10px] font-bold text-zinc-500">
                  {item.details.sent_to_count} destinatarios
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────────

interface AnnouncementCenterProps {
  clubs: Club[]
}

export function AnnouncementCenter({ clubs }: AnnouncementCenterProps) {
  const [announcements, setAnnouncements] = useState<AuditAnnouncement[]>([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)
  const [sentTo, setSentTo] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/announcements")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.success) {
          setAnnouncements(json.data ?? [])
        }
      })
      .catch(() => {
        // silently ignore — the list will show empty state
      })
      .finally(() => {
        if (!cancelled) setLoadingAnnouncements(false)
      })
    return () => { cancelled = true }
  }, [])

  function handleSent(count: number) {
    setSentTo(count)
    // Re-fetch announcements list to show the new entry
    setLoadingAnnouncements(true)
    fetch("/api/admin/announcements")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setAnnouncements(json.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoadingAnnouncements(false))
  }

  return (
    <div className="flex flex-col gap-6">
      {sentTo !== null && (
        <SentBanner sentTo={sentTo} onClose={() => setSentTo(null)} />
      )}

      <AnnouncementForm clubs={clubs} onSent={handleSent} />

      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">
          Anuncios enviados recientes
        </p>
        <AnnouncementsList announcements={announcements} loading={loadingAnnouncements} />
      </div>
    </div>
  )
}
