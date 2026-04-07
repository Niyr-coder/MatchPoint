"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Clock, MapPin, AlertCircle } from "lucide-react"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import type { Reservation, ReservationInvite } from "@/features/bookings/types"

type Tab = "upcoming" | "past" | "cancelled"

const SPORT_LABELS: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

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

function isUpcoming(r: Reservation): boolean {
  const today = new Date().toISOString().split("T")[0]
  return r.date >= today && r.status !== "cancelled"
}

function isPast(r: Reservation): boolean {
  const today = new Date().toISOString().split("T")[0]
  return r.date < today && r.status !== "cancelled"
}

function isCancelled(r: Reservation): boolean {
  return r.status === "cancelled"
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

interface ReservationCardProps {
  reservation: Reservation
  showCancel: boolean
  onCancel: (id: string) => void
  cancellingId: string | null
}

function ReservationCard({ reservation, showCancel, onCancel, cancellingId }: ReservationCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const isCancelling = cancellingId === reservation.id

  return (
    <div className="animate-fade-in-up rounded-2xl bg-white border border-[#e5e5e5] p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-black text-[#0a0a0a]">
            {reservation.courts?.name ?? "Cancha"}
          </p>
          <p className="text-[11px] text-zinc-400">
            {reservation.courts?.clubs?.name ?? "Club"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {reservation.courts?.sport && (
            <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border bg-blue-50 text-[#1a56db] border-blue-200">
              {SPORT_LABELS[reservation.courts.sport] ?? reservation.courts.sport}
            </span>
          )}
          <StatusBadge
            label={getStatusLabel(reservation.status)}
            variant={getStatusVariant(reservation.status)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1">
          <Calendar className="size-3" />
          {formatDate(reservation.date)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {reservation.start_time.slice(0, 5)} – {reservation.end_time.slice(0, 5)}
        </span>
        {reservation.total_price > 0 && (
          <span className="flex items-center gap-1">
            <MapPin className="size-3" />
            ${reservation.total_price.toFixed(2)}
          </span>
        )}
      </div>

      {showCancel && (
        <>
          <button
            onClick={() => setDialogOpen(true)}
            disabled={isCancelling}
            className="self-end text-[11px] font-black uppercase tracking-[0.15em] text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
          >
            Cancelar reserva
          </button>
          <ConfirmDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            title="Cancelar reserva"
            description="¿Estás seguro de que deseas cancelar esta reserva? Esta acción no se puede deshacer."
            confirmLabel="Sí, cancelar"
            variant="danger"
            loading={isCancelling}
            onConfirm={() => onCancel(reservation.id)}
          />
        </>
      )}
    </div>
  )
}

interface ReservationsListProps {
  reservations: Reservation[]
  invites: ReservationInvite[]
}

export function ReservationsList({ reservations, invites }: ReservationsListProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("upcoming")
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [localReservations, setLocalReservations] = useState<Reservation[]>(reservations)
  const [, startTransition] = useTransition()

  const upcoming = localReservations.filter(isUpcoming)
  const past = localReservations.filter(isPast)
  const cancelled = localReservations.filter(isCancelled)

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "upcoming", label: "Próximas", count: upcoming.length },
    { key: "past", label: "Pasadas", count: past.length },
    { key: "cancelled", label: "Canceladas", count: cancelled.length },
  ]

  async function handleCancel(id: string) {
    setCancellingId(id)
    try {
      const res = await fetch("/api/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error("Error al cancelar")
      startTransition(() => {
        setLocalReservations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "cancelled" as const } : r))
        )
        router.refresh()
      })
    } catch {
      // silently revert — user can retry
    } finally {
      setCancellingId(null)
    }
  }

  const currentList = activeTab === "upcoming" ? upcoming : activeTab === "past" ? past : cancelled

  return (
    <div className="flex flex-col gap-6">
      {invites.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertCircle className="size-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-black text-amber-800">
              Tienes {invites.length} invitación{invites.length > 1 ? "es" : ""} pendiente{invites.length > 1 ? "s" : ""}
            </p>
            <p className="text-[11px] text-amber-600 mt-0.5">
              Revisa tu correo o accede a la sección de notificaciones para responder.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-[0.12em] transition-colors ${
              activeTab === tab.key
                ? "bg-white text-[#0a0a0a] shadow-sm"
                : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 text-[9px] bg-zinc-200 text-zinc-600 rounded-full px-1.5 py-0.5">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {currentList.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={
            activeTab === "upcoming"
              ? "No tienes reservas próximas"
              : activeTab === "past"
              ? "No tienes reservas pasadas"
              : "No tienes reservas canceladas"
          }
          description={
            activeTab === "upcoming"
              ? "Reserva una cancha para comenzar a jugar."
              : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {currentList.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              showCancel={activeTab === "upcoming" && reservation.status !== "cancelled"}
              onCancel={handleCancel}
              cancellingId={cancellingId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
