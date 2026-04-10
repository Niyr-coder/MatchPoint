"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, PowerOff, Home, ExternalLink } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { StatCard } from "@/components/shared/StatCard"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { CourtForm } from "@/features/clubs/components/CourtForm"
import type { Court } from "@/features/clubs/types"

const SPORT_LABELS: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

type SportBadgeVariant = "success" | "accent" | "info" | "warning"

const SPORT_BADGE_VARIANT: Record<string, SportBadgeVariant> = {
  futbol: "success",
  padel: "accent",
  tenis: "info",
  pickleball: "warning",
}

interface CourtsManagerProps {
  courts: Court[]
  clubId: string
}

export function CourtsManager({ courts, clubId }: CourtsManagerProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingCourt, setEditingCourt] = useState<Court | undefined>(undefined)
  const [deactivatingCourt, setDeactivatingCourt] = useState<Court | undefined>(undefined)
  const [deactivateLoading, setDeactivateLoading] = useState(false)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)

  const total = courts.length
  const active = courts.filter((c) => c.is_active).length
  const inactive = courts.filter((c) => !c.is_active).length
  const uniqueSports = new Set(courts.map((c) => c.sport)).size

  function openCreateSheet() {
    setEditingCourt(undefined)
    setSheetOpen(true)
  }

  function openEditSheet(court: Court) {
    setEditingCourt(court)
    setSheetOpen(true)
  }

  function handleFormSuccess() {
    setSheetOpen(false)
    startTransition(() => router.refresh())
  }

  async function handleDeactivate() {
    if (!deactivatingCourt) return
    setDeactivateLoading(true)
    setDeactivateError(null)
    try {
      const res = await fetch(
        `/api/club/${clubId}/courts/${deactivatingCourt.id}`,
        { method: "DELETE" }
      )
      const json = await res.json()
      if (!json.success) {
        setDeactivateError(json.error ?? "Error desconocido")
        return
      }
      setDeactivatingCourt(undefined)
      startTransition(() => router.refresh())
    } catch {
      setDeactivateError("Error de conexión. Intenta de nuevo.")
    } finally {
      setDeactivateLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header with action */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">
            Infraestructura
          </p>
          <h1 className="text-3xl font-black uppercase tracking-[-0.03em] text-foreground leading-none">
            Canchas
          </h1>
        </div>
        <button
          onClick={openCreateSheet}
          className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] px-4 py-2 bg-foreground text-white rounded-full hover:bg-foreground/90 transition-colors shrink-0"
        >
          <Plus className="size-3.5" />
          Agregar Cancha
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={total} />
        <StatCard label="Activas" value={active} variant="success" />
        <StatCard label="Inactivas" value={inactive} variant="warning" />
        <StatCard label="Deportes" value={uniqueSports} variant="accent" />
      </div>

      {/* Court grid */}
      {courts.length === 0 ? (
        <EmptyState
          icon={Home}
          title="No hay canchas registradas"
          description="Agrega la primera cancha de tu club para comenzar."
          action={
            <button
              onClick={openCreateSheet}
              className="text-[11px] font-black text-foreground hover:underline"
            >
              Agregar cancha →
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courts.map((court) => (
            <div
              key={court.id}
              className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-3"
            >
              {/* Top row: sport badge + status */}
              <div className="flex items-center justify-between">
                <StatusBadge
                  label={SPORT_LABELS[court.sport] ?? court.sport}
                  variant={SPORT_BADGE_VARIANT[court.sport] ?? "neutral"}
                />
                <StatusBadge
                  label={court.is_active ? "Activa" : "Inactiva"}
                  variant={court.is_active ? "success" : "error"}
                />
              </div>

              {/* Court name */}
              <h3 className="text-sm font-black text-foreground leading-tight">
                {court.name}
              </h3>

              {/* Details */}
              <div className="flex flex-col gap-1 text-[11px] text-zinc-500">
                {court.surface_type && (
                  <span>Superficie: {court.surface_type}</span>
                )}
                <span>{court.is_indoor ? "Cubierta (Indoor)" : "Descubierta (Outdoor)"}</span>
                <span className="font-bold text-foreground">
                  ${court.price_per_hour.toFixed(2)} / hora
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1 border-t border-border-subtle mt-auto">
                <button
                  onClick={() => openEditSheet(court)}
                  className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-border text-zinc-600 hover:bg-secondary transition-colors"
                >
                  <Pencil className="size-3" />
                  Editar
                </button>
                {court.is_active && (
                  <button
                    onClick={() => setDeactivatingCourt(court)}
                    className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <PowerOff className="size-3" />
                    Desactivar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-base font-black uppercase tracking-tight text-foreground">
              {editingCourt ? "Editar Cancha" : "Nueva Cancha"}
            </SheetTitle>
            <SheetDescription className="text-sm text-zinc-500">
              {editingCourt
                ? "Modifica los datos de la cancha."
                : "Completa los datos para agregar una nueva cancha al club."}
            </SheetDescription>
          </SheetHeader>
          <CourtForm
            court={editingCourt}
            clubId={clubId}
            onSuccess={handleFormSuccess}
            onCancel={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Deactivate ConfirmDialog */}
      <ConfirmDialog
        open={Boolean(deactivatingCourt)}
        onOpenChange={(open) => {
          if (!open) setDeactivatingCourt(undefined)
        }}
        title="¿Desactivar cancha?"
        description={`La cancha "${deactivatingCourt?.name}" dejará de estar disponible para reservas. Puedes reactivarla desde la edición.`}
        confirmLabel="Desactivar"
        variant="danger"
        loading={deactivateLoading}
        onConfirm={handleDeactivate}
      />

      {/* Inline error for deactivation */}
      {deactivateError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {deactivateError}
        </div>
      )}
    </div>
  )
}

// Re-export icon used in empty state (avoids import in server page)
export { ExternalLink }
