"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CalendarCheck, Clock, XCircle } from "lucide-react"
import { FilterBar } from "@/components/shared/FilterBar"
import { DataTable } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import type { Column } from "@/components/shared/DataTable"
import type { ReservationAdmin } from "@/app/api/admin/reservations/route"

// ── Helpers ──────────────────────────────────────────────────────────────────

const SPORT_LABELS: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

const STATUS_BADGE: Record<
  ReservationAdmin["status"],
  { label: string; variant: "success" | "warning" | "error" | "neutral" }
> = {
  confirmed: { label: "Confirmada", variant: "success" },
  pending: { label: "Pendiente", variant: "warning" },
  cancelled: { label: "Cancelada", variant: "error" },
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDateTime(date: string, startTime: string, endTime: string): string {
  const d = new Date(`${date}T00:00:00`)
  const dateStr = d.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  return `${dateStr} · ${startTime.slice(0, 5)} – ${endTime.slice(0, 5)}`
}

function isToday(date: string): boolean {
  const today = new Date().toISOString().split("T")[0]
  return date === today
}

function isThisMonth(createdAt: string): boolean {
  const now = new Date()
  const d = new Date(createdAt)
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

// ── Stats card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  accent?: boolean
}

function StatCard({ icon, label, value, accent = false }: StatCardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 flex items-center gap-4 ${
        accent
          ? "bg-[#0a0a0a] border-[#0a0a0a] text-white"
          : "bg-white border-[#e5e5e5] text-[#0a0a0a]"
      }`}
    >
      <div
        className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
          accent ? "bg-white/10" : "bg-zinc-100"
        }`}
      >
        {icon}
      </div>
      <div>
        <p
          className={`text-[10px] font-black uppercase tracking-[0.18em] mb-0.5 ${
            accent ? "text-white/60" : "text-zinc-400"
          }`}
        >
          {label}
        </p>
        <p className="text-2xl font-black leading-none">{value}</p>
      </div>
    </div>
  )
}

// ── Filter options ────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "confirmed", label: "Confirmada" },
  { value: "pending", label: "Pendiente" },
  { value: "cancelled", label: "Cancelada" },
]

// ── Main component ────────────────────────────────────────────────────────────

interface AdminReservationsViewProps {
  reservations: ReservationAdmin[]
  clubs: Array<{ id: string; name: string }>
}

export function AdminReservationsView({
  reservations,
  clubs,
}: AdminReservationsViewProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [filters, setFilters] = useState<Record<string, string>>({
    search: "",
    club_id: "",
    status: "",
    from_date: "",
    to_date: "",
  })

  const [pendingCancel, setPendingCancel] = useState<ReservationAdmin | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalReservations = reservations.length
  const activeToday = reservations.filter(
    (r) => r.status !== "cancelled" && isToday(r.date)
  ).length
  const cancelledThisMonth = reservations.filter(
    (r) => r.status === "cancelled" && isThisMonth(r.created_at)
  ).length

  // ── Client-side filtering ─────────────────────────────────────────────────

  const filtered = reservations.filter((r) => {
    const search = filters.search.toLowerCase()
    const matchSearch =
      !search ||
      (r.user_name ?? "").toLowerCase().includes(search) ||
      (r.user_email ?? "").toLowerCase().includes(search) ||
      (r.club_name ?? "").toLowerCase().includes(search) ||
      (r.court_name ?? "").toLowerCase().includes(search)

    const matchClub = !filters.club_id || r.club_id === filters.club_id
    const matchStatus = !filters.status || r.status === filters.status
    const matchFrom = !filters.from_date || r.date >= filters.from_date
    const matchTo = !filters.to_date || r.date <= filters.to_date

    return matchSearch && matchClub && matchStatus && matchFrom && matchTo
  })

  // ── Cancel action ─────────────────────────────────────────────────────────

  const handleCancel = useCallback(async () => {
    if (!pendingCancel) return
    setCancelLoading(true)
    setCancelError(null)
    try {
      const res = await fetch(`/api/admin/reservations/${pendingCancel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      })
      const json: { success: boolean; error?: string | null } = await res.json()
      if (!json.success) {
        setCancelError(json.error ?? "Error al cancelar la reserva")
        return
      }
      setPendingCancel(null)
      startTransition(() => router.refresh())
    } catch {
      setCancelError("Error de conexión. Intenta de nuevo.")
    } finally {
      setCancelLoading(false)
    }
  }, [pendingCancel, router, startTransition])

  // ── Club filter options ───────────────────────────────────────────────────

  const clubOptions = clubs.map((c) => ({ value: c.id, label: c.name }))

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns: Column<ReservationAdmin>[] = [
    {
      key: "user",
      header: "Usuario",
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-[#0a0a0a]">{r.user_name ?? "—"}</span>
          {r.user_email && (
            <span className="text-[11px] text-zinc-400">{r.user_email}</span>
          )}
        </div>
      ),
    },
    {
      key: "club",
      header: "Club",
      render: (r) => (
        <span className="text-sm text-zinc-600">{r.club_name ?? "—"}</span>
      ),
    },
    {
      key: "court",
      header: "Cancha",
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-[#0a0a0a]">
            {r.court_name ?? "—"}
          </span>
          {r.court_sport && (
            <span className="text-[11px] text-zinc-400">
              {SPORT_LABELS[r.court_sport] ?? r.court_sport}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "datetime",
      header: "Fecha y hora",
      render: (r) => (
        <span className="text-sm text-zinc-600">
          {formatDateTime(r.date, r.start_time, r.end_time)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (r) => {
        const { label, variant } = STATUS_BADGE[r.status]
        return <StatusBadge label={label} variant={variant} />
      },
    },
    {
      key: "total_price",
      header: "Precio",
      render: (r) => (
        <span className="font-bold text-[#0a0a0a]">{formatPrice(r.total_price)}</span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      render: (r) =>
        r.status !== "cancelled" ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setCancelError(null)
              setPendingCancel(r)
            }}
            className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
          >
            Cancelar
          </button>
        ) : (
          <span className="text-[11px] text-zinc-300 font-bold uppercase tracking-wide">
            —
          </span>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<CalendarCheck className="size-5 text-zinc-500" />}
          label="Total reservas"
          value={totalReservations}
        />
        <StatCard
          icon={<Clock className="size-5 text-white" />}
          label="Activas hoy"
          value={activeToday}
          accent
        />
        <StatCard
          icon={<XCircle className="size-5 text-zinc-500" />}
          label="Canceladas este mes"
          value={cancelledThisMonth}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <FilterBar
          searchPlaceholder="Buscar por usuario, club o cancha..."
          filters={[
            {
              key: "club_id",
              label: "Todos los clubs",
              options: clubOptions,
            },
            {
              key: "status",
              label: "Todos los estados",
              options: STATUS_OPTIONS,
            },
          ]}
          values={filters}
          onFilterChange={handleFilterChange}
        />
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-black uppercase tracking-wide text-zinc-400">
              Desde
            </label>
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => handleFilterChange("from_date", e.target.value)}
              className="border border-[#e5e5e5] rounded-xl px-3 py-2 text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-black uppercase tracking-wide text-zinc-400">
              Hasta
            </label>
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => handleFilterChange("to_date", e.target.value)}
              className="border border-[#e5e5e5] rounded-xl px-3 py-2 text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white"
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage="No se encontraron reservas"
        keyExtractor={(r) => r.id}
      />

      {cancelError && !pendingCancel && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {cancelError}
        </div>
      )}

      <ConfirmDialog
        open={pendingCancel !== null}
        onOpenChange={(open) => {
          if (!open && !cancelLoading) setPendingCancel(null)
        }}
        title="¿Cancelar reserva?"
        description={
          pendingCancel
            ? `Se cancelará la reserva de ${pendingCancel.user_name ?? "este usuario"} en ${
                pendingCancel.court_name ?? "la cancha"
              } para el ${pendingCancel.date}. Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Cancelar reserva"
        variant="danger"
        loading={cancelLoading}
        onConfirm={handleCancel}
      />
    </div>
  )
}
