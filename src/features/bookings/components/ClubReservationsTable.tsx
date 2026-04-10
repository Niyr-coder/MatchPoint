"use client"

import { useState, useTransition } from "react"
import { FilterBar, type FilterConfig } from "@/components/shared/FilterBar"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { DataTable, type Column } from "@/components/shared/DataTable"
import type { ReservationWithProfile } from "@/features/bookings/types"

type FilterValues = Record<string, string>

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmada" },
  { value: "cancelled", label: "Cancelada" },
]

function getStatusVariant(status: string) {
  if (status === "confirmed") return "success" as const
  if (status === "pending") return "warning" as const
  return "neutral" as const
}

function getStatusLabel(status: string) {
  if (status === "confirmed") return "Confirmada"
  if (status === "pending") return "Pendiente"
  return "Cancelada"
}

function formatDateTime(date: string, startTime: string, endTime: string): string {
  const d = new Date(date + "T12:00:00").toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
  })
  return `${d} · ${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`
}

interface ActionCellProps {
  reservation: ReservationWithProfile
  clubId: string
  onUpdate: (id: string, status: "confirmed" | "cancelled") => Promise<void>
  updatingId: string | null
}

function ActionCell({ reservation, onUpdate, updatingId }: ActionCellProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const isUpdating = updatingId === reservation.id

  if (reservation.status === "cancelled") {
    return <span className="text-[11px] text-zinc-400">—</span>
  }

  return (
    <div className="flex items-center gap-2">
      {reservation.status === "pending" && (
        <>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={isUpdating}
            className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] hover:bg-[#dcfce7] transition-colors disabled:opacity-50"
          >
            Confirmar
          </button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Confirmar reserva"
            description="¿Deseas confirmar esta reserva?"
            confirmLabel="Confirmar"
            loading={isUpdating}
            onConfirm={() => onUpdate(reservation.id, "confirmed")}
          />
        </>
      )}
      <button
        onClick={() => setCancelOpen(true)}
        disabled={isUpdating}
        className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
      >
        Cancelar
      </button>
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar reserva"
        description="¿Estás seguro de que deseas cancelar esta reserva?"
        confirmLabel="Cancelar reserva"
        variant="danger"
        loading={isUpdating}
        onConfirm={() => onUpdate(reservation.id, "cancelled")}
      />
    </div>
  )
}

interface ClubReservationsTableProps {
  initialReservations: ReservationWithProfile[]
  clubId: string
  courtOptions?: { value: string; label: string }[]
  showActions?: boolean
}

export function ClubReservationsTable({
  initialReservations,
  clubId,
  courtOptions = [],
  showActions = true,
}: ClubReservationsTableProps) {
  const [reservations, setReservations] = useState(initialReservations)
  const [filters, setFilters] = useState<FilterValues>({})
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const filterConfigs: FilterConfig[] = [
    {
      key: "status",
      label: "Estado",
      options: STATUS_OPTIONS,
    },
    ...(courtOptions.length > 0
      ? [{ key: "court", label: "Cancha", options: courtOptions }]
      : []),
  ]

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const filtered = reservations.filter((r) => {
    const search = (filters.search ?? "").toLowerCase()
    const statusMatch = !filters.status || r.status === filters.status
    const courtMatch = !filters.court || r.court_id === filters.court
    const searchMatch =
      !search ||
      (r.profiles?.full_name ?? "").toLowerCase().includes(search) ||
      (r.courts?.name ?? "").toLowerCase().includes(search)

    return statusMatch && courtMatch && searchMatch
  })

  async function handleUpdate(id: string, status: "confirmed" | "cancelled") {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/club/${clubId}/reservations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error("Error al actualizar")
      startTransition(() => {
        setReservations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r))
        )
      })
    } catch {
      // user can retry
    } finally {
      setUpdatingId(null)
    }
  }

  const columns: Column<ReservationWithProfile>[] = [
    {
      key: "user",
      header: "Usuario",
      render: (r) => (
        <div>
          <p className="text-sm font-bold text-foreground">
            {r.profiles?.full_name ?? "—"}
          </p>
          {r.profiles?.phone && (
            <p className="text-[11px] text-zinc-400">{r.profiles.phone}</p>
          )}
        </div>
      ),
    },
    {
      key: "court",
      header: "Cancha",
      render: (r) => (
        <p className="text-sm text-foreground">{r.courts?.name ?? "—"}</p>
      ),
    },
    {
      key: "sport",
      header: "Deporte",
      render: (r) =>
        r.courts?.sport ? (
          <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border bg-card text-foreground border-border">
            {r.courts.sport}
          </span>
        ) : (
          <span>—</span>
        ),
    },
    {
      key: "datetime",
      header: "Fecha y Hora",
      render: (r) => (
        <p className="text-sm text-foreground">
          {formatDateTime(r.date, r.start_time, r.end_time)}
        </p>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (r) => (
        <StatusBadge label={getStatusLabel(r.status)} variant={getStatusVariant(r.status)} />
      ),
    },
    ...(showActions
      ? [
          {
            key: "actions",
            header: "Acción",
            render: (r: ReservationWithProfile) => (
              <ActionCell
                reservation={r}
                clubId={clubId}
                onUpdate={handleUpdate}
                updatingId={updatingId}
              />
            ),
          },
        ]
      : []),
  ]

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        filters={filterConfigs}
        searchPlaceholder="Buscar por usuario o cancha..."
        values={filters}
        onFilterChange={handleFilterChange}
      />
      <div className="animate-fade-in-up-8">
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No se encontraron reservas"
          keyExtractor={(r) => r.id}
        />
      </div>
    </div>
  )
}
