"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Eye, EyeOff, XCircle, Users, Link2 } from "lucide-react"
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
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [modal, setModal] = useState<ModalMode | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const [attendeesTarget, setAttendeesTarget] = useState<{ id: string; title: string } | null>(null)

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [inviteOpenId, setInviteOpenId] = useState<string | null>(null)

  // Stats
  const total     = events.length
  const published = events.filter((e) => e.status === "published").length
  const upcoming  = events.filter((e) => new Date(e.start_date) > new Date()).length
  const totalRegs = events.reduce((acc, e) => acc + e.registration_count, 0)

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

    const startIso = form.start_date
      ? `${form.start_date}T${form.start_time || "00:00"}:00Z`
      : undefined
    const endIso = form.end_date
      ? `${form.end_date}T${form.end_time || "00:00"}:00Z`
      : undefined

    const payload = {
      title:                 form.title.trim(),
      description:           form.description || undefined,
      event_type:            form.event_type,
      sport:                 form.sport || undefined,
      club_id:               clubId,
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
        res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else if (modal?.type === "edit") {
        res = await fetch(`/api/events/${modal.event.id}`, {
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

  async function togglePublish(event: EventWithClub) {
    const newStatus: EventStatus = event.status === "published" ? "draft" : "published"
    setActionLoading(event.id)
    setActionError(null)

    try {
      const res = await fetch(`/api/events/${event.id}`, {
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

  async function cancelEvent(event: EventWithClub) {
    if (!confirm(`¿Cancelar el evento "${event.title}"? Esta acción no se puede deshacer.`)) return
    setActionLoading(event.id)
    setActionError(null)

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      })
      const json = (await res.json()) as { success: boolean; error?: string | null }
      if (!json.success) {
        setActionError(json.error ?? "Error al cancelar")
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
      {actionError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {actionError}
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
              const isActioning = actionLoading === event.id

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
          loading={modalLoading}
          error={modalError}
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
