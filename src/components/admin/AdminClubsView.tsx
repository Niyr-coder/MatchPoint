"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FilterBar } from "@/components/shared/FilterBar"
import { DataTable } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { ECUADOR_PROVINCES } from "@/lib/constants"
import type { Column } from "@/components/shared/DataTable"
import type { ClubAdmin } from "@/lib/admin/queries"

const PROVINCE_OPTIONS = ECUADOR_PROVINCES.map((p) => ({ value: p, label: p }))

interface AdminClubsViewProps {
  clubs: ClubAdmin[]
}

export function AdminClubsView({ clubs }: AdminClubsViewProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [filters, setFilters] = useState<Record<string, string>>({
    search: "",
    province: "",
  })

  const [confirmClub, setConfirmClub] = useState<ClubAdmin | undefined>(undefined)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const filtered = clubs.filter((club) => {
    const matchSearch =
      !filters.search ||
      club.name.toLowerCase().includes(filters.search.toLowerCase())
    const matchProvince = !filters.province || club.province === filters.province
    return matchSearch && matchProvince
  })

  async function handleToggle() {
    if (!confirmClub) return
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch("/api/admin/clubs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: confirmClub.id, isActive: !confirmClub.is_active }),
      })
      const json = await res.json()
      if (!json.success) {
        setActionError(json.error ?? "Error desconocido")
        return
      }
      setConfirmClub(undefined)
      startTransition(() => router.refresh())
    } catch {
      setActionError("Error de conexión. Intenta de nuevo.")
    } finally {
      setActionLoading(false)
    }
  }

  const columns: Column<ClubAdmin>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (club) => (
        <span className="font-bold text-[#0a0a0a]">{club.name}</span>
      ),
    },
    {
      key: "city",
      header: "Ciudad",
      render: (club) => (
        <span className="text-zinc-500">{club.city ?? "—"}</span>
      ),
    },
    {
      key: "members_count",
      header: "Miembros",
      render: (club) => (
        <span className="font-semibold">{club.members_count}</span>
      ),
    },
    {
      key: "courts_count",
      header: "Canchas",
      render: (club) => (
        <span className="font-semibold">{club.courts_count}</span>
      ),
    },
    {
      key: "is_active",
      header: "Estado",
      render: (club) => (
        <StatusBadge
          label={club.is_active ? "Activo" : "Inactivo"}
          variant={club.is_active ? "success" : "error"}
        />
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      render: (club) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setConfirmClub(club)
          }}
          className={`text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors ${
            club.is_active
              ? "border-red-200 text-red-600 hover:bg-red-50"
              : "border-[#bbf7d0] text-[#16a34a] hover:bg-[#f0fdf4]"
          }`}
        >
          {club.is_active ? "Desactivar" : "Activar"}
        </button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <FilterBar
        searchPlaceholder="Buscar club..."
        filters={[
          {
            key: "province",
            label: "Todas las provincias",
            options: PROVINCE_OPTIONS,
          },
        ]}
        values={filters}
        onFilterChange={handleFilterChange}
      />

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage="No se encontraron clubs"
      />

      {actionError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {actionError}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmClub)}
        onOpenChange={(open) => {
          if (!open) setConfirmClub(undefined)
        }}
        title={confirmClub?.is_active ? "¿Desactivar club?" : "¿Activar club?"}
        description={
          confirmClub?.is_active
            ? `El club "${confirmClub?.name}" quedará suspendido y sus miembros no podrán acceder.`
            : `El club "${confirmClub?.name}" volverá a estar disponible en la plataforma.`
        }
        confirmLabel={confirmClub?.is_active ? "Desactivar" : "Activar"}
        variant={confirmClub?.is_active ? "danger" : "default"}
        loading={actionLoading}
        onConfirm={handleToggle}
      />
    </div>
  )
}
