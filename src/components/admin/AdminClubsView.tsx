"use client"

import { useState, useTransition, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2, X, Plus } from "lucide-react"
import { FilterBar } from "@/components/shared/FilterBar"
import { DataTable } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { ECUADOR_PROVINCES } from "@/lib/constants"
import type { Column } from "@/components/shared/DataTable"
import type { ClubAdmin } from "@/lib/admin/queries"

const PROVINCE_OPTIONS = ECUADOR_PROVINCES.map((p) => ({ value: p, label: p }))

const SPORTS_OPTIONS = [
  { value: "futbol", label: "Fútbol" },
  { value: "padel", label: "Pádel" },
  { value: "tenis", label: "Tenis" },
  { value: "pickleball", label: "Pickleball" },
]

// ── Form state ──────────────────────────────────────────────────────────────

interface ClubFormData {
  name: string
  city: string
  province: string
  description: string
  sports: string[]
}

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

function validateForm(form: ClubFormData): string | null {
  if (form.name.trim().length < 2) return "El nombre debe tener al menos 2 caracteres."
  if (form.city.trim().length < 2) return "La ciudad debe tener al menos 2 caracteres."
  if (!form.province) return "Selecciona una provincia."
  return null
}

// ── Modal ────────────────────────────────────────────────────────────────────

interface ClubModalProps {
  mode: "create" | "edit"
  initial: ClubFormData
  onClose: () => void
  onSave: (form: ClubFormData) => Promise<void>
  loading: boolean
  error: string | null
}

function ClubModal({ mode, initial, onClose, onSave, loading, error }: ClubModalProps) {
  const [form, setForm] = useState<ClubFormData>(initial)
  const [validationError, setValidationError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [loading, onClose])

  // Close on backdrop click
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!loading && dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      onClose()
    }
  }

  function handleSportToggle(value: string) {
    setForm((prev) => ({
      ...prev,
      sports: prev.sports.includes(value)
        ? prev.sports.filter((s) => s !== value)
        : [...prev.sports, value],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validateForm(form)
    if (err) {
      setValidationError(err)
      return
    }
    setValidationError(null)
    await onSave(form)
  }

  const displayError = validationError ?? error

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-2xl bg-white border border-[#e5e5e5] shadow-xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="club-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#e5e5e5]">
          <p
            id="club-modal-title"
            className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400"
          >
            {mode === "create" ? "Crear club" : "Editar club"}
          </p>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar"
            className="size-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-[#0a0a0a] hover:bg-zinc-100 transition-colors disabled:opacity-50"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Nombre del club <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ej. Club Deportivo Quito"
                className="border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#0a0a0a] placeholder:text-zinc-400 outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white"
                disabled={loading}
                maxLength={100}
              />
            </div>

            {/* City */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Ciudad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="Ej. Quito"
                className="border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#0a0a0a] placeholder:text-zinc-400 outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white"
                disabled={loading}
                maxLength={100}
              />
            </div>

            {/* Province */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Provincia <span className="text-red-500">*</span>
              </label>
              <select
                value={form.province}
                onChange={(e) => setForm((prev) => ({ ...prev, province: e.target.value }))}
                className="border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white appearance-none cursor-pointer"
                disabled={loading}
              >
                <option value="">Selecciona una provincia</option>
                {ECUADOR_PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Descripción <span className="text-zinc-400 font-normal normal-case">(opcional)</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Breve descripción del club..."
                rows={3}
                className="border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#0a0a0a] placeholder:text-zinc-400 outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white resize-none"
                disabled={loading}
                maxLength={500}
              />
              <p className="text-[10px] text-zinc-400 text-right">{form.description.length}/500</p>
            </div>

            {/* Sports */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Deportes <span className="text-zinc-400 font-normal normal-case">(opcional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SPORTS_OPTIONS.map((sport) => {
                  const active = form.sports.includes(sport.value)
                  return (
                    <button
                      key={sport.value}
                      type="button"
                      onClick={() => handleSportToggle(sport.value)}
                      disabled={loading}
                      className={`text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
                        active
                          ? "bg-[#0a0a0a] border-[#0a0a0a] text-white"
                          : "border-[#e5e5e5] text-zinc-500 hover:border-[#0a0a0a] hover:text-[#0a0a0a]"
                      }`}
                    >
                      {sport.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Error */}
            {displayError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {displayError}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-[#e5e5e5] bg-zinc-50/60">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border border-[#e5e5e5] rounded-full py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50 bg-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#0a0a0a] hover:bg-zinc-800 text-white rounded-full py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              {mode === "create" ? "Crear club" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
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
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

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
        <div className="flex items-center gap-2">
          {/* Toggle active */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setActionError(null)
              setModal({ type: "toggle", club })
            }}
            className={`text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors ${
              club.is_active
                ? "border-red-200 text-red-600 hover:bg-red-50"
                : "border-[#bbf7d0] text-[#16a34a] hover:bg-[#f0fdf4]"
            }`}
          >
            {club.is_active ? "Desactivar" : "Activar"}
          </button>

          {/* Edit */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setActionError(null)
              setModal({ type: "edit", club })
            }}
            className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-[#e5e5e5] text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Editar
          </button>

          {/* Delete */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setActionError(null)
              setModal({ type: "delete", club })
            }}
            className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
          >
            Eliminar
          </button>
        </div>
      ),
    },
  ]

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
          className="flex items-center gap-2 bg-[#0a0a0a] hover:bg-zinc-800 text-white text-[11px] font-black uppercase tracking-wide px-4 py-2.5 rounded-full transition-colors"
        >
          <Plus className="size-3.5" />
          Crear club
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage="No se encontraron clubs"
      />

      {actionError && modal.type === "none" && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {actionError}
        </div>
      )}

      {/* Create modal */}
      {modal.type === "create" && (
        <ClubModal
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
        <ClubModal
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
