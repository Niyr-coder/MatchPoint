"use client"

import { useState } from "react"
import { Plus, ChevronRight } from "lucide-react"
import { useEventMutations } from "@/features/activities/hooks/useEventMutations"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { FilterBar } from "@/components/shared/FilterBar"
import { DataTable } from "@/components/shared/DataTable"
import { AdminDotsMenu } from "@/components/admin/shared/AdminDotsMenu"
import { AdminInlinePanel } from "@/components/admin/shared/AdminInlinePanel"
import { EventFormModal, EMPTY_EVENT_FORM } from "@/features/activities/components/EventForm"
import { EVENT_TYPE_CONFIG, EVENT_STATUS_CONFIG, SPORT_LABELS } from "@/features/activities/constants"
import { CalendarDays, CheckCircle, Globe } from "lucide-react"
import type { Column } from "@/components/shared/DataTable"
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

// ── types ──────────────────────────────────────────────────────────────────────

interface ClubOption { id: string; name: string }

interface AdminEventsViewProps {
  events: EventWithClub[]
  clubs: ClubOption[]
}

type ModalMode = { type: "create" } | { type: "edit"; event: EventWithClub }

// ── constants ─────────────────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS = [
  { value: "draft",     label: "Borrador" },
  { value: "published", label: "Publicado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "completed", label: "Completado" },
]

// ── main component ────────────────────────────────────────────────────────────

export function AdminEventsView({ events, clubs }: AdminEventsViewProps) {
  const mutations = useEventMutations({ apiBasePath: "/api/admin/events" })

  const [modal, setModal]       = useState<ModalMode | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filters, setFilters]   = useState<Record<string, string>>({ search: "", status: "" })

  // ── stats ──────────────────────────────────────────────────────────────────

  const total     = events.length
  const published = events.filter((e) => e.status === "published").length
  const cancelled = events.filter((e) => e.status === "cancelled").length
  const totalRegs = events.reduce((acc, e) => acc + e.registration_count, 0)

  // ── filter ─────────────────────────────────────────────────────────────────

  const filtered = events.filter((e) => {
    const matchText   = !filters.search || e.title.toLowerCase().includes(filters.search.toLowerCase())
    const matchStatus = !filters.status || e.status === filters.status
    return matchText && matchStatus
  })

  // ── handlers ───────────────────────────────────────────────────────────────

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function toggleExpand(eventId: string) {
    setExpandedId((prev) => (prev === eventId ? null : eventId))
  }

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

  async function handleCancelEvent(eventId: string) {
    await mutations.updateStatus(eventId, "cancelled" as EventStatus)
  }

  // ── columns ────────────────────────────────────────────────────────────────

  const columns: Column<EventWithClub>[] = [
    {
      key: "expand",
      header: "",
      render: (event) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleExpand(event.id) }}
          className="flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors"
          aria-label={expandedId === event.id ? "Colapsar" : "Expandir"}
        >
          <ChevronRight
            className={`size-4 transition-transform duration-200 ${expandedId === event.id ? "rotate-90" : ""}`}
          />
        </button>
      ),
      className: "w-6",
    },
    {
      key: "title",
      header: "Título",
      render: (event) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-foreground">{event.title}</span>
          {event.club_name && (
            <span className="text-[11px] text-zinc-400">{event.club_name}</span>
          )}
        </div>
      ),
    },
    {
      key: "event_type",
      header: "Tipo",
      render: (event) => {
        const cfg = EVENT_TYPE_CONFIG[event.event_type as EventType]
        return (
          <span
            className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${cfg ? `${cfg.bg} ${cfg.color} ${cfg.border}` : "bg-muted text-zinc-600 border-border"}`}
          >
            {cfg?.label ?? event.event_type}
          </span>
        )
      },
    },
    {
      key: "status",
      header: "Estado",
      render: (event) => {
        const cfg = EVENT_STATUS_CONFIG[event.status as EventStatus]
        return (
          <StatusBadge
            label={cfg?.label ?? event.status}
            variant={cfg?.variant ?? "neutral"}
          />
        )
      },
    },
    {
      key: "start_date",
      header: "Fecha",
      render: (event) => (
        <span className="text-[11px] text-zinc-500">
          {event.start_date ? formatDate(event.start_date) : "—"}
        </span>
      ),
    },
    {
      key: "registration_count",
      header: "Inscritos",
      render: (event) => (
        <span className="font-semibold">{event.registration_count}</span>
      ),
    },
    {
      key: "dots",
      header: "",
      render: (event) => {
        const isTerminal = event.status === "cancelled" || event.status === "completed"
        return (
          <AdminDotsMenu
            items={[
              {
                label: "Editar",
                disabled: isTerminal,
                onClick: () => openEdit(event),
              },
              {
                label: "Ver inscritos",
                onClick: () => { /* TODO: navigate to registrations */ },
              },
              {
                label: "Cancelar evento",
                variant: "danger",
                disabled: isTerminal,
                onClick: () => void handleCancelEvent(event.id),
              },
            ]}
          />
        )
      },
      className: "flex justify-end",
    },
  ]

  // ── expanded row renderer ──────────────────────────────────────────────────

  function renderExpandedRow(event: EventWithClub) {
    const cfg        = EVENT_STATUS_CONFIG[event.status as EventStatus]
    const isTerminal = event.status === "cancelled" || event.status === "completed"

    const chips: string[] = []
    if (event.club_name) chips.push(event.club_name)
    if (event.sport)     chips.push(SPORT_LABELS[event.sport] ?? event.sport)
    if (event.registration_count > 0) chips.push(`${event.registration_count} inscritos`)
    if (event.price != null) chips.push(event.price === 0 ? "Gratis" : `$${event.price}`)

    const avatar = (
      <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center">
        <CalendarDays className="size-5 text-purple-600" />
      </div>
    )

    const badge = cfg ? (
      <StatusBadge label={cfg.label} variant={cfg.variant} />
    ) : undefined

    return (
      <AdminInlinePanel
        avatar={avatar}
        name={event.title}
        subtitle={event.start_date ? formatDate(event.start_date) : "Sin fecha"}
        chips={chips}
        badge={badge}
        actions={
          <>
            {!isTerminal && (
              <button
                onClick={() => openEdit(event)}
                className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-border text-zinc-600 hover:bg-secondary transition-colors"
              >
                Editar
              </button>
            )}
            <button
              className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-border text-zinc-600 hover:bg-secondary transition-colors"
            >
              Ver inscritos
            </button>
            {!isTerminal && (
              <button
                onClick={() => void handleCancelEvent(event.id)}
                className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                Cancelar evento
              </button>
            )}
          </>
        }
      />
    )
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Eventos"  value={total}     icon={CalendarDays} variant="default" />
        <StatCard label="Publicados"     value={published} icon={Globe}        variant="success" />
        <StatCard label="Cancelados"     value={cancelled} icon={CheckCircle}  variant="warning" />
        <StatCard label="Inscripciones"  value={totalRegs} icon={CheckCircle}  variant="accent"  />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <FilterBar
            searchPlaceholder="Buscar por título…"
            filters={[{ key: "status", label: "Todos los estados", options: STATUS_FILTER_OPTIONS }]}
            values={filters}
            onFilterChange={handleFilterChange}
          />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-foreground text-white rounded-full px-4 py-2 text-sm font-bold hover:bg-foreground/90 transition-colors shrink-0"
        >
          <Plus className="size-4" />Crear evento
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
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No se encontraron eventos"
          onRowClick={(event) => toggleExpand(event.id)}
          expandedRowId={expandedId}
          renderExpandedRow={renderExpandedRow}
          gridTemplateColumns="32px 1fr 0.5fr 0.5fr 0.6fr 0.4fr 40px"
        />
      )}

      {/* Event form modal */}
      {modal && (
        <EventFormModal
          title={modal.type === "create" ? "Crear evento" : "Editar evento"}
          mode={modal.type}
          initial={modal.type === "edit" ? eventToForm(modal.event) : EMPTY_EVENT_FORM}
          clubs={clubs}
          loading={mutations.modalLoading}
          error={mutations.modalError}
          onSubmit={handleModalSubmit}
          onCancel={closeModal}
          isAdmin
        />
      )}
    </div>
  )
}
