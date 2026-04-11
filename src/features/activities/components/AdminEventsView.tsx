"use client"

import { useState } from "react"
import { Plus, Pencil, Eye, EyeOff, XCircle, Users, Trash2 } from "lucide-react"
import { useEventMutations } from "@/features/activities/hooks/useEventMutations"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { EventFormModal, EMPTY_EVENT_FORM } from "@/features/activities/components/EventForm"
import { EVENT_TYPE_CONFIG, EVENT_STATUS_CONFIG, SPORT_LABELS } from "@/features/activities/constants"
import { CalendarDays, CheckCircle, Globe } from "lucide-react"
import type { EventWithClub, EventType, EventStatus } from "@/features/activities/types"
import type { EventFormState } from "@/features/activities/components/EventForm"
import { eventToForm } from "@/features/activities/utils"

// ── helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
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
  const mutations = useEventMutations({ apiBasePath: "/api/admin/events" })

  const [modal, setModal] = useState<ModalMode | null>(null)
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
    mutations.setModalError(null)
    setModal({ type: "create" })
  }

  function openEdit(event: EventWithClub) {
    mutations.setModalError(null)
    setModal({ type: "edit", event })
  }

  function closeModal() {
    if (mutations.modalLoading) return
    setModal(null)
    mutations.setModalError(null)
  }

  async function handleModalSubmit(form: EventFormState) {
    const eventId = modal?.type === "edit" ? modal.event.id : undefined
    const success = await mutations.submitEvent(form, modal?.type ?? "create", eventId)
    if (success) setModal(null)
  }

  async function updateStatus(event: EventWithClub, newStatus: EventStatus) {
    await mutations.updateStatus(event.id, newStatus)
  }

  async function deleteEvent(event: EventWithClub) {
    if (!confirm(`¿Eliminar definitivamente el evento "${event.title}"?`)) return
    await mutations.deleteEvent(event.id)
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
      {mutations.actionError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {mutations.actionError}
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
              const isActioning = mutations.actionLoadingId === event.id

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
          loading={mutations.modalLoading}
          error={mutations.modalError}
          onSubmit={handleModalSubmit}
          onCancel={closeModal}
          isAdmin
        />
      )}
    </>
  )
}

