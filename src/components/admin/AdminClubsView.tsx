"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, ChevronRight } from "lucide-react"
import { FilterBar } from "@/components/shared/FilterBar"
import { DataTable } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { AdminDotsMenu } from "@/components/admin/shared/AdminDotsMenu"
import { AdminInlinePanel } from "@/components/admin/shared/AdminInlinePanel"
import { useBulkSelection } from "@/hooks/useBulkSelection"
import { ClubBulkBar } from "@/components/admin/ClubBulkBar"
import { AdminClubModal } from "@/components/admin/AdminClubModal"
import { ECUADOR_PROVINCES } from "@/lib/constants"
import type { Column } from "@/components/shared/DataTable"
import type { ClubAdmin } from "@/lib/admin/queries"
import type { ClubFormData } from "@/components/admin/AdminClubModal"

const PROVINCE_OPTIONS = ECUADOR_PROVINCES.map((p) => ({ value: p, label: p }))

// ── Form helpers ─────────────────────────────────────────────────────────────

const EMPTY_FORM: ClubFormData = {
  name: "",
  city: "",
  province: "",
  description: "",
  sports: [],
}

function formFromClub(club: ClubAdmin): ClubFormData {
  return {
    name: club.name,
    city: club.city ?? "",
    province: club.province ?? "",
    description: club.description ?? "",
    sports: [],
  }
}

// ── Main component ───────────────────────────────────────────────────────────

interface AdminClubsViewProps {
  clubs: ClubAdmin[]
}

type ModalState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; club: ClubAdmin }
  | { type: "delete"; club: ClubAdmin }
  | { type: "toggle"; club: ClubAdmin }

export function AdminClubsView({ clubs }: AdminClubsViewProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [filters, setFilters] = useState<Record<string, string>>({
    search: "",
    province: "",
  })

  const [modal, setModal] = useState<ModalState>({ type: "none" })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  function toggleExpand(clubId: string) {
    setExpandedId((prev) => (prev === clubId ? null : clubId))
  }

  // Bulk actions
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function closeModal() {
    if (!actionLoading) {
      setModal({ type: "none" })
      setActionError(null)
    }
  }

  const filtered = clubs.filter((club) => {
    const matchSearch =
      !filters.search ||
      club.name.toLowerCase().includes(filters.search.toLowerCase())
    const matchProvince = !filters.province || club.province === filters.province
    return matchSearch && matchProvince
  })

  const filteredIds = filtered.map((c) => c.id)
  const bulk = useBulkSelection(filteredIds)

  async function executeBulkAction(action: "activate" | "deactivate") {
    if (bulk.selectedCount === 0) return
    setBulkLoading(true)
    setBulkError(null)
    try {
      const res = await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          entity_type: "club",
          ids: Array.from(bulk.selectedIds),
        }),
      })
      const json = (await res.json()) as {
        success: boolean
        data: { success_count: number; failed_ids: string[] } | null
        error: string | null
      }
      if (!json.success) {
        setBulkError(json.error ?? "Error al ejecutar la operación masiva")
        return
      }
      bulk.clearSelection()
      startTransition(() => router.refresh())
    } catch {
      setBulkError("Error de conexión. Intenta de nuevo.")
    } finally {
      setBulkLoading(false)
    }
  }

  // ── Toggle active/inactive ─────────────────────────────────────────────────

  const handleToggle = useCallback(async () => {
    if (modal.type !== "toggle") return
    const club = modal.club
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch("/api/admin/clubs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: club.id, isActive: !club.is_active }),
      })
      const json: { success: boolean; error?: string | null } = await res.json()
      if (!json.success) {
        setActionError(json.error ?? "Error desconocido")
        return
      }
      setModal({ type: "none" })
      startTransition(() => router.refresh())
    } catch {
      setActionError("Error de conexión. Intenta de nuevo.")
    } finally {
      setActionLoading(false)
    }
  }, [modal, router, startTransition])

  // ── Create ────────────────────────────────────────────────────────────────

  async function handleCreate(form: ClubFormData) {
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch("/api/admin/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          city: form.city.trim(),
          province: form.province,
          description: form.description.trim() || null,
        }),
      })
      const json: { success: boolean; error?: string | null } = await res.json()
      if (!json.success) {
        setActionError(json.error ?? "Error al crear el club")
        return
      }
      setModal({ type: "none" })
      startTransition(() => router.refresh())
    } catch {
      setActionError("Error de conexión. Intenta de nuevo.")
    } finally {
      setActionLoading(false)
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  async function handleEdit(form: ClubFormData) {
    if (modal.type !== "edit") return
    const club = modal.club
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/clubs/${club.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          city: form.city.trim(),
          province: form.province,
          description: form.description.trim() || null,
        }),
      })
      const json: { success: boolean; error?: string | null } = await res.json()
      if (!json.success) {
        setActionError(json.error ?? "Error al actualizar el club")
        return
      }
      setModal({ type: "none" })
      startTransition(() => router.refresh())
    } catch {
      setActionError("Error de conexión. Intenta de nuevo.")
    } finally {
      setActionLoading(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (modal.type !== "delete") return
    const club = modal.club
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/clubs/${club.id}`, { method: "DELETE" })
      const json: { success: boolean; error?: string | null } = await res.json()
      if (!json.success) {
        setActionError(json.error ?? "Error al eliminar el club")
        return
      }
      setModal({ type: "none" })
      startTransition(() => router.refresh())
    } catch {
      setActionError("Error de conexión. Intenta de nuevo.")
    } finally {
      setActionLoading(false)
    }
  }, [modal, router, startTransition])

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns: Column<ClubAdmin>[] = [
    {
      key: "expand",
      header: "",
      render: (club) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleExpand(club.id) }}
          className="flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors"
          aria-label={expandedId === club.id ? "Colapsar" : "Expandir"}
        >
          <ChevronRight className={`size-4 transition-transform duration-200 ${expandedId === club.id ? "rotate-90" : ""}`} />
        </button>
      ),
      className: "w-6",
    },
    {
      key: "checkbox",
      header: "",
      render: (club) => (
        <input
          type="checkbox"
          checked={bulk.selectedIds.has(club.id)}
          onChange={() => bulk.toggleOne(club.id)}
          onClick={(e) => e.stopPropagation()}
          className="size-4 rounded border-zinc-300 accent-zinc-900 cursor-pointer"
          aria-label={`Seleccionar ${club.name}`}
        />
      ),
      className: "w-8 shrink-0",
    },
    {
      key: "name",
      header: "Nombre",
      render: (club) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-foreground">{club.name}</span>
          {club.province && <span className="text-[11px] text-zinc-400">{club.province}</span>}
        </div>
      ),
    },
    {
      key: "city",
      header: "Ciudad",
      render: (club) => <span className="text-zinc-500">{club.city ?? "—"}</span>,
    },
    {
      key: "members_count",
      header: "Miembros",
      render: (club) => <span className="font-semibold">{club.members_count}</span>,
    },
    {
      key: "courts_count",
      header: "Canchas",
      render: (club) => <span className="font-semibold">{club.courts_count}</span>,
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
      key: "dots",
      header: "",
      render: (club) => (
        <AdminDotsMenu
          items={[
            {
              label: "Editar",
              onClick: () => { setActionError(null); setModal({ type: "edit", club }) },
            },
            {
              label: club.is_active ? "Desactivar" : "Activar",
              onClick: () => { setActionError(null); setModal({ type: "toggle", club }) },
            },
            {
              label: "Eliminar",
              variant: "danger",
              onClick: () => { setActionError(null); setModal({ type: "delete", club }) },
            },
          ]}
        />
      ),
      className: "flex justify-end",
    },
  ]

  function renderExpandedRow(club: ClubAdmin) {
    const chips = [
      club.province ?? null,
      club.members_count ? `${club.members_count} miembros` : null,
      club.courts_count ? `${club.courts_count} canchas` : null,
    ].filter(Boolean) as string[]

    const avatar = (
      <div className="w-11 h-11 rounded-xl bg-zinc-200 flex items-center justify-center">
        <span className="text-sm font-black text-zinc-600">
          {club.name.slice(0, 2).toUpperCase()}
        </span>
      </div>
    )

    const badge = (
      <StatusBadge
        label={club.is_active ? "Activo" : "Inactivo"}
        variant={club.is_active ? "success" : "error"}
      />
    )

    return (
      <AdminInlinePanel
        avatar={avatar}
        name={club.name}
        subtitle={club.city ? `${club.city}${club.province ? `, ${club.province}` : ""}` : "Sin ciudad"}
        chips={chips}
        badge={badge}
        actions={
          <>
            <button
              onClick={() => { setActionError(null); setModal({ type: "edit", club }) }}
              className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-border text-zinc-600 hover:bg-secondary transition-colors"
            >
              Editar
            </button>
            <button
              onClick={() => { setActionError(null); setModal({ type: "toggle", club }) }}
              className={`text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors ${
                club.is_active
                  ? "border-red-200 text-red-600 hover:bg-red-50"
                  : "border-success-border text-primary hover:bg-success"
              }`}
            >
              {club.is_active ? "Desactivar" : "Activar"}
            </button>
            <button
              onClick={() => { setActionError(null); setModal({ type: "delete", club }) }}
              className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            >
              Eliminar
            </button>
          </>
        }
      />
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const toggleClub = modal.type === "toggle" ? modal.club : undefined
  const deleteClub = modal.type === "delete" ? modal.club : undefined

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
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
        </div>
        <button
          onClick={() => {
            setActionError(null)
            setModal({ type: "create" })
          }}
          className="flex items-center gap-2 bg-foreground hover:bg-foreground/90 text-white text-[11px] font-black uppercase tracking-wide px-4 py-2.5 rounded-full transition-colors"
        >
          <Plus className="size-3.5" />
          Crear club
        </button>
      </div>

      {/* Select-all row */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <input
            type="checkbox"
            checked={bulk.isAllSelected}
            ref={(el) => {
              if (el) el.indeterminate = bulk.isIndeterminate
            }}
            onChange={() => bulk.toggleAll(filteredIds)}
            className="size-4 rounded border-zinc-300 accent-zinc-900 cursor-pointer"
            aria-label="Seleccionar todos los clubs"
          />
          <span className="text-[11px] text-zinc-400 font-semibold">
            Seleccionar todos ({filtered.length})
          </span>
        </div>
      )}

      {/* Bulk action bar */}
      {bulk.selectedCount > 0 && (
        <ClubBulkBar
          count={bulk.selectedCount}
          loading={bulkLoading}
          onActivate={() => void executeBulkAction("activate")}
          onDeactivate={() => void executeBulkAction("deactivate")}
          onClear={bulk.clearSelection}
        />
      )}

      {bulkError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {bulkError}
        </div>
      )}

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage="No se encontraron clubs"
        onRowClick={(club) => toggleExpand(club.id)}
        expandedRowId={expandedId}
        renderExpandedRow={renderExpandedRow}
        gridTemplateColumns="32px 32px 1fr 0.7fr 0.5fr 0.5fr 0.6fr 40px"
      />

      {actionError && modal.type === "none" && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {actionError}
        </div>
      )}

      {/* Create modal */}
      {modal.type === "create" && (
        <AdminClubModal
          mode="create"
          initial={EMPTY_FORM}
          onClose={closeModal}
          onSave={handleCreate}
          loading={actionLoading}
          error={actionError}
        />
      )}

      {/* Edit modal */}
      {modal.type === "edit" && (
        <AdminClubModal
          mode="edit"
          initial={formFromClub(modal.club)}
          onClose={closeModal}
          onSave={handleEdit}
          loading={actionLoading}
          error={actionError}
        />
      )}

      {/* Toggle confirm */}
      <ConfirmDialog
        open={modal.type === "toggle"}
        onOpenChange={(open) => {
          if (!open) closeModal()
        }}
        title={toggleClub?.is_active ? "¿Desactivar club?" : "¿Activar club?"}
        description={
          toggleClub?.is_active
            ? `El club "${toggleClub?.name}" quedará suspendido y sus miembros no podrán acceder.`
            : `El club "${toggleClub?.name}" volverá a estar disponible en la plataforma.`
        }
        confirmLabel={toggleClub?.is_active ? "Desactivar" : "Activar"}
        variant={toggleClub?.is_active ? "danger" : "default"}
        loading={actionLoading}
        onConfirm={handleToggle}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={modal.type === "delete"}
        onOpenChange={(open) => {
          if (!open) closeModal()
        }}
        title="¿Eliminar club?"
        description={`Esta acción es irreversible. El club "${deleteClub?.name}" y todos sus datos serán eliminados permanentemente.`}
        confirmLabel="Eliminar"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
      />
    </div>
  )
}
