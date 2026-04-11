"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Eye, EyeOff, XCircle, Users, Link2 } from "lucide-react"
import { useEventMutations } from "@/features/activities/hooks/useEventMutations"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { EventFormModal, EMPTY_EVENT_FORM } from "@/features/activities/components/EventForm"
import { InviteLinkGenerator } from "@/features/memberships/components/InviteLinkGenerator"
import { EVENT_TYPE_CONFIG, EVENT_STATUS_CONFIG } from "@/features/activities/constants"
import { CalendarDays, CheckCircle } from "lucide-react"
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

// ── AttendeesModal ─────────────────────────────────────────────────────────────

interface AttendeeRow {
  user_id: string
  display_name: string | null
}

interface AttendeesModalProps {
  eventTitle: string
  eventId: string
  onClose: () => void
}

function AttendeesModal({ eventTitle, eventId, onClose }: AttendeesModalProps) {
  const [attendees, setAttendees] = useState<AttendeeRow[] | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/events/${eventId}/attendees`)
      .then((r) => r.json())
      .then((json: { data?: AttendeeRow[]; error?: string }) => {
        if (cancelled) return
        if (json.error) setFetchError(json.error)
        else setAttendees(json.data ?? [])
      })
      .catch(() => {
        if (!cancelled) setFetchError("Error al cargar asistentes")
      })
    return () => { cancelled = true }
  }, [eventId])

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="rounded-2xl bg-card border border-border p-6 w-full max-w-md shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Asistentes</p>
            <h3 className="text-sm font-black text-foreground leading-tight">{eventTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-zinc-400"
          >
            <XCircle className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {fetchError ? (
            <p className="text-sm text-red-500 text-center py-4">{fetchError}</p>
          ) : attendees === null ? (
            <p className="text-sm text-zinc-400 text-center py-4">Cargando…</p>
          ) : attendees.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-6">Sin asistentes registrados</p>
          ) : (
            <div className="flex flex-col divide-y divide-[#f5f5f5]">
              {attendees.map((a) => (
                <div key={a.user_id} className="py-2.5 flex items-center gap-2">
                  <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Users className="size-3.5 text-zinc-400" />
                  </div>
                  <span className="text-sm text-zinc-700">{a.display_name ?? "Usuario"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ClubEventsView ─────────────────────────────────────────────────────────────

interface ClubEventsViewProps {
  events: EventWithClub[]
  clubId: string
  role: "owner" | "manager"
}

type ModalMode = { type: "create" } | { type: "edit"; event: EventWithClub }

export function ClubEventsView({ events, clubId, role }: ClubEventsViewProps) {
  const mutations = useEventMutations({ apiBasePath: "/api/events" })

  const [modal, setModal] = useState<ModalMode | null>(null)
  const [attendeesTarget, setAttendeesTarget] = useState<{ id: string; title: string } | null>(null)
  const [inviteOpenId, setInviteOpenId] = useState<string | null>(null)

  // Stats
  const total     = events.length
  const published = events.filter((e) => e.status === "published").length
  const upcoming  = events.filter((e) => new Date(e.start_date) > new Date()).length
  const totalRegs = events.reduce((acc, e) => acc + e.registration_count, 0)

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
    const success = await mutations.submitEvent(form, modal?.type ?? "create", eventId, clubId)
    if (success) setModal(null)
  }

  async function togglePublish(event: EventWithClub) {
    const newStatus: EventStatus = event.status === "published" ? "draft" : "published"
    await mutations.updateStatus(event.id, newStatus)
  }

  async function cancelEvent(event: EventWithClub) {
    if (!confirm(`¿Cancelar el evento "${event.title}"? Esta acción no se puede deshacer.`)) return
    await mutations.updateStatus(event.id, "cancelled")
  }

  const modalInitial: EventFormState =
    modal?.type === "edit" ? eventToForm(modal.event) : EMPTY_EVENT_FORM

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total eventos"  value={total}     icon={CalendarDays} variant="default" />
        <StatCard label="Publicados"     value={published} icon={CheckCircle}  variant="success" />
        <StatCard label="Próximos"       value={upcoming}  icon={CalendarDays} variant="accent"  />
        <StatCard label="Registraciones" value={totalRegs} icon={Users}        variant="default" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">
          {total} evento{total !== 1 ? "s" : ""}
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-foreground text-white rounded-full px-4 py-2 text-sm font-bold hover:bg-foreground/90 transition-colors"
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
      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Sin eventos creados"
          description="Crea el primer evento del club para empezar a recibir inscripciones."
        />
      ) : (
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 border-b border-border bg-muted/50">
            {["Título", "Tipo", "Estado", "Inscritos", "Fecha", ""].map((h) => (
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
            {events.map((event) => {
              const typeCfg   = event.event_type ? EVENT_TYPE_CONFIG[event.event_type] : null
              const statusCfg = EVENT_STATUS_CONFIG[event.status]
              const isTerminal = event.status === "cancelled" || event.status === "completed"
              const isActioning = mutations.actionLoadingId === event.id

              return (
                <div key={event.id} className="flex flex-col">
                <div
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3.5 items-center hover:bg-muted/50 transition-colors"
                >
                  {/* Title */}
                  <div>
                    <p className="text-sm font-bold text-foreground leading-tight truncate">
                      {event.title}
                    </p>
                    {!event.is_free && event.price != null && (
                      <p className="text-[10px] text-zinc-400 mt-0.5">${event.price.toFixed(2)}</p>
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
                    <button
                      onClick={() => setAttendeesTarget({ id: event.id, title: event.title })}
                      title="Ver asistentes"
                      className="size-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-zinc-400 hover:text-foreground"
                    >
                      <Users className="size-3.5" />
                    </button>

                    {event.status === "published" && (
                      <button
                        onClick={() => setInviteOpenId(inviteOpenId === event.id ? null : event.id)}
                        title="Generar link de invitación"
                        className={`size-7 flex items-center justify-center rounded-lg transition-colors ${
                          inviteOpenId === event.id
                            ? "bg-[#16a34a] text-white"
                            : "hover:bg-muted text-zinc-400 hover:text-[#16a34a]"
                        }`}
                      >
                        <Link2 className="size-3.5" />
                      </button>
                    )}

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

                    {!isTerminal && (
                      <button
                        onClick={() => togglePublish(event)}
                        title={event.status === "published" ? "Despublicar" : "Publicar"}
                        disabled={isActioning}
                        className="size-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-zinc-400 hover:text-foreground disabled:opacity-40"
                      >
                        {event.status === "published"
                          ? <EyeOff className="size-3.5" />
                          : <Eye className="size-3.5" />}
                      </button>
                    )}

                    {!isTerminal && (
                      <button
                        onClick={() => cancelEvent(event)}
                        title="Cancelar evento"
                        disabled={isActioning}
                        className="size-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors text-zinc-400 hover:text-red-600 disabled:opacity-40"
                      >
                        <XCircle className="size-3.5" />
                      </button>
                    )}

                    {isTerminal && (
                      <span className="text-[10px] text-zinc-300 font-bold uppercase px-1">—</span>
                    )}
                  </div>
                </div>

                {/* Inline invite panel */}
                {inviteOpenId === event.id && (
                  <div className="px-5 pb-4 border-t border-border">
                    <div className="rounded-xl border border-border bg-muted p-4 mt-3">
                      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-3">
                        Link de invitación — {event.title}
                      </p>
                      <InviteLinkGenerator
                        entityType="event"
                        entityId={event.id}
                        label="Generar link de invitación al evento"
                      />
                    </div>
                  </div>
                )}
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
          loading={mutations.modalLoading}
          error={mutations.modalError}
          onSubmit={handleModalSubmit}
          onCancel={closeModal}
        />
      )}

      {/* Attendees modal */}
      {attendeesTarget && (
        <AttendeesModal
          eventId={attendeesTarget.id}
          eventTitle={attendeesTarget.title}
          onClose={() => setAttendeesTarget(null)}
        />
      )}
    </>
  )
}
