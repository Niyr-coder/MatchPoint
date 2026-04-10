"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Eye, EyeOff, XCircle, Users, Trash2 } from "lucide-react"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { EventFormModal, EMPTY_EVENT_FORM } from "@/features/activities/components/EventForm"
import { EVENT_TYPE_CONFIG, EVENT_STATUS_CONFIG, SPORT_LABELS } from "@/features/activities/constants"
import { CalendarDays, CheckCircle, Globe } from "lucide-react"
import type { EventWithClub, EventType, EventStatus } from "@/features/activities/types"
import type { EventFormState } from "@/features/activities/components/EventForm"

// ── helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function eventToForm(event: EventWithClub): EventFormState {
  return {
    title:                 event.title,
    description:           event.description ?? "",
    event_type:            event.event_type ?? "social",
    sport:                 event.sport ?? "",
    club_id:               event.club_id ?? "",
    city:                  event.city ?? "",
    location:              event.location ?? "",
    start_date:            event.start_date.split("T")[0] ?? "",
    start_time:            event.start_date.includes("T")
      ? event.start_date.split("T")[1]?.slice(0, 5) ?? "09:00"
      : "09:00",
    end_date:              event.end_date?.split("T")[0] ?? "",
    end_time:              event.end_date?.includes("T")
      ? event.end_date.split("T")[1]?.slice(0, 5) ?? ""
      : "",
    image_url:             event.image_url ?? "",
    max_capacity:          event.max_capacity != null ? String(event.max_capacity) : "",
    is_free:               event.is_free,
    price:                 event.price != null ? String(event.price) : "",
    visibility:            event.visibility,
    registration_deadline: event.registration_deadline?.split("T")[0] ?? "",
    min_participants:      event.min_participants != null ? String(event.min_participants) : "",
    organizer_name:        event.organizer_name ?? "",
    organizer_contact:     event.organizer_contact ?? "",
    tags:                  event.tags ?? [],
  }
}

// ── ClubFilterBar ──────────────────────────────────────────────────────────────

interface ClubOption { id: string; name: string }

interface FilterBarProps {
  filter: string
  onFilterChange: (v: string) => void
  clubs: ClubOption[]
  statusFilter: string
  onStatusFilter: (v: string) => void
}

function FilterBar({ filter, onFilterChange, clubs, statusFilter, onStatusFilter }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <input
        type="text"
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        placeholder="Buscar por título…"
        className="border border-border rounded-full px-3 py-1.5 text-xs text-zinc-700 placeholder:text-zinc-400 outline-none focus:border-foreground bg-card"
      />
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilter(e.target.value)}
        className="border border-border rounded-full px-3 py-1.5 text-xs font-bold text-zinc-600 outline-none focus:border-foreground bg-card"
      >
        <option value="">Todos los estados</option>
        <option value="draft">Borrador</option>
        <option value="published">Publicado</option>
        <option value="cancelled">Cancelado</option>
        <option value="completed">Completado</option>
      </select>
    </div>
  )
}

// ── AdminEventsView ────────────────────────────────────────────────────────────

interface AdminEventsViewProps {
  events: EventWithClub[]
  clubs: ClubOption[]
}

type ModalMode = { type: "create" } | { type: "edit"; event: EventWithClub }

export function AdminEventsView({ events, clubs }: AdminEventsViewProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [modal, setModal] = useState<ModalMode | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [textFilter, setTextFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  // Stats
  const total     = events.length
  const published = events.filter((e) => e.status === "published").length
  const cancelled = events.filter((e) => e.status === "cancelled").length
  const totalRegs = events.reduce((acc, e) => acc + e.registration_count, 0)

  // Filtered rows
  const filtered = events.filter((e) => {
    const matchText   = !textFilter   || e.title.toLowerCase().includes(textFilter.toLowerCase())
    const matchStatus = !statusFilter || e.status === statusFilter
    return matchText && matchStatus
  })

  function openCreate() {
    setModalError(null)
    setModal({ type: "create" })
  }

  function openEdit(event: EventWithClub) {
    setModalError(null)
    setModal({ type: "edit", event })
  }

  function closeModal() {
    if (modalLoading) return
    setModal(null)
    setModalError(null)
  }

  async function handleModalSubmit(form: EventFormState) {
    setModalLoading(true)
    setModalError(null)

    const startIso = `${form.start_date}T${form.start_time || "00:00"}:00Z`
    const endIso = form.end_date
      ? `${form.end_date}T${form.end_time || "00:00"}:00Z`
      : undefined

    const payload = {
      title:                 form.title.trim(),
      description:           form.description || undefined,
      event_type:            form.event_type,
      sport:                 form.sport || undefined,
      club_id:               form.club_id || undefined,
      city:                  form.city || undefined,
      location:              form.location || undefined,
      start_date:            startIso,
      end_date:              endIso,
      image_url:             form.image_url || undefined,
      max_capacity:          form.max_capacity ? parseInt(form.max_capacity, 10) : undefined,
      is_free:               form.is_free,
      price:                 !form.is_free && form.price ? parseFloat(form.price) : undefined,
      visibility:            form.visibility,
      registration_deadline: form.registration_deadline
        ? `${form.registration_deadline}T00:00:00Z`
        : undefined,
      min_participants:      form.min_participants ? parseInt(form.min_participants, 10) : undefined,
      organizer_name:        form.organizer_name || undefined,
      organizer_contact:     form.organizer_contact || undefined,
      tags:                  form.tags.length > 0 ? form.tags : undefined,
    }

    try {
      let res: Response
      if (modal?.type === "create") {
        res = await fetch("/api/admin/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else if (modal?.type === "edit") {
        res = await fetch(`/api/admin/events/${modal.event.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        return
      }

      const json = (await res.json()) as { success: boolean; error?: string | null }
      if (!json.success) {
        setModalError(json.error ?? "Error desconocido")
        return
      }
      setModal(null)
      startTransition(() => router.refresh())
    } catch {
      setModalError("Error de conexión. Intenta de nuevo.")
    } finally {
      setModalLoading(false)
    }
  }

  async function updateStatus(event: EventWithClub, newStatus: EventStatus) {
    setActionLoading(event.id)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = (await res.json()) as { success: boolean; error?: string | null }
      if (!json.success) {
        setActionError(json.error ?? "Error al actualizar")
        return
      }
      startTransition(() => router.refresh())
    } catch {
      setActionError("Error de conexión.")
    } finally {
      setActionLoading(null)
    }
  }

  async function deleteEvent(event: EventWithClub) {
    if (!confirm(`¿Eliminar definitivamente el evento "${event.title}"?`)) return
    setActionLoading(event.id)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, { method: "DELETE" })
      const json = (await res.json()) as { success: boolean; error?: string | null }
      if (!json.success) {
        setActionError(json.error ?? "Error al eliminar")
        return
      }
      startTransition(() => router.refresh())
    } catch {
      setActionError("Error de conexión.")
    } finally {
      setActionLoading(null)
    }
  }

  const modalInitial: EventFormState =
    modal?.type === "edit" ? eventToForm(modal.event) : EMPTY_EVENT_FORM

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total eventos"  value={total}     icon={CalendarDays} variant="default" />
        <StatCard label="Publicados"     value={published} icon={Globe}        variant="success" />
        <StatCard label="Cancelados"     value={cancelled} icon={XCircle}      variant="warning" />
        <StatCard label="Registraciones" value={totalRegs} icon={Users}        variant="accent"  />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterBar
          filter={textFilter}
          onFilterChange={setTextFilter}
          clubs={clubs}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
        />
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-foreground text-white rounded-full px-4 py-2 text-sm font-bold hover:bg-foreground/90 transition-colors shrink-0"
        >
          <Plus className="size-3.5" />
          Crear evento
        </button>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {actionError}
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Sin eventos"
          description="No hay eventos que coincidan con los filtros seleccionados."
        />
      ) : (
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 border-b border-border bg-muted/50">
            {["Título", "Tipo", "Club", "Estado", "Inscritos", "Fecha", ""].map((h) => (
              <p
                key={h}
                className="text-[10px] font-black uppercase tracking-wide text-zinc-400 last:text-right"
              >
                {h}
              </p>
            ))}
          </div>

          {/* Rows */}
          <div className="flex flex-col divide-y divide-[#f0f0f0]">
            {filtered.map((event) => {
              const typeCfg    = event.event_type ? EVENT_TYPE_CONFIG[event.event_type] : null
              const statusCfg  = EVENT_STATUS_CONFIG[event.status]
              const isTerminal = event.status === "cancelled" || event.status === "completed"
              const isActioning = actionLoading === event.id

              return (
                <div
                  key={event.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3.5 items-center hover:bg-muted/50 transition-colors"
                >
                  {/* Title */}
                  <div>
                    <p className="text-sm font-bold text-foreground leading-tight truncate">
                      {event.title}
                    </p>
                    {event.sport && (
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {SPORT_LABELS[event.sport] ?? event.sport}
                      </p>
                    )}
                  </div>

                  {/* Type */}
                  <div>
                    {typeCfg ? (
                      <span
                        className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${typeCfg.bg} ${typeCfg.color} ${typeCfg.border}`}
                      >
                        {typeCfg.label}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400">—</span>
                    )}
                  </div>

                  {/* Club */}
                  <p className="text-xs text-zinc-600 truncate">{event.club_name ?? "—"}</p>

                  {/* Status */}
                  <div>
                    <StatusBadge label={statusCfg.label} variant={statusCfg.variant} />
                  </div>

                  {/* Registrations */}
                  <p className="text-sm font-black text-foreground">
                    {event.registration_count}
                    {event.max_capacity != null && (
                      <span className="text-zinc-400 font-normal">/{event.max_capacity}</span>
                    )}
                  </p>

                  {/* Date */}
                  <p className="text-xs text-zinc-500">{formatDate(event.start_date)}</p>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end">
                    {!isTerminal && (
                      <button
                        onClick={() => openEdit(event)}
                        title="Editar"
                        disabled={isActioning}
                        className="size-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-zinc-400 hover:text-foreground disabled:opacity-40"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    )}

                    {!isTerminal && event.status === "published" && (
                      <button
                        onClick={() => updateStatus(event, "draft")}
                        title="Despublicar"
                        disabled={isActioning}
                        className="size-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-zinc-400 hover:text-foreground disabled:opacity-40"
                      >
                        <EyeOff className="size-3.5" />
                      </button>
                    )}

                    {!isTerminal && event.status !== "published" && (
                      <button
                        onClick={() => updateStatus(event, "published")}
                        title="Publicar"
                        disabled={isActioning}
                        className="size-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-zinc-400 hover:text-foreground disabled:opacity-40"
                      >
                        <Eye className="size-3.5" />
                      </button>
                    )}

                    {!isTerminal && (
                      <button
                        onClick={() => updateStatus(event, "cancelled")}
                        title="Cancelar evento"
                        disabled={isActioning}
                        className="size-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors text-zinc-400 hover:text-red-600 disabled:opacity-40"
                      >
                        <XCircle className="size-3.5" />
                      </button>
                    )}

                    {isTerminal && (
                      <button
                        onClick={() => updateStatus(event, "completed")}
                        title="Marcar completado"
                        disabled={isActioning || event.status === "completed"}
                        className="size-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-zinc-300 hover:text-foreground disabled:opacity-40"
                      >
                        <CheckCircle className="size-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => deleteEvent(event)}
                      title="Eliminar"
                      disabled={isActioning}
                      className="size-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors text-zinc-300 hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Event form modal */}
      {modal && (
        <EventFormModal
          title={modal.type === "create" ? "Crear evento" : "Editar evento"}
          mode={modal.type}
          initial={modalInitial}
          clubs={clubs}
          loading={modalLoading}
          error={modalError}
          onSubmit={handleModalSubmit}
          onCancel={closeModal}
        />
      )}
    </>
  )
}

