"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { BadgeCheck, Plus, ChevronRight } from "lucide-react"
import { FilterBar } from "@/components/shared/FilterBar"
import { DataTable } from "@/components/shared/DataTable"
import { RoleBadge } from "@/components/shared/RoleBadge"
import { ConfirmDialog as SharedConfirmDialog } from "@/components/shared/ConfirmDialog"
import { CreateUserModal } from "@/components/admin/CreateUserModal"
import { AdminDotsMenu } from "@/components/admin/shared/AdminDotsMenu"
import { AdminInlinePanel } from "@/components/admin/shared/AdminInlinePanel"
import { useBulkSelection } from "@/hooks/useBulkSelection"
import { UserBulkBar } from "@/components/admin/UserBulkBar"
import { OriginBadge } from "@/components/admin/user-detail/OriginBadge"
import { displayName, isSuspended, initials, formatDate } from "@/components/admin/user-detail/helpers"
import { ROLE_LABELS } from "@/features/memberships/constants"
import type { Column } from "@/components/shared/DataTable"
import type { UserAdmin, ClubAdmin } from "@/lib/admin/queries"
import type { AppRole } from "@/types"

// ── types ──────────────────────────────────────────────────────────────────────

interface SuspendTarget {
  userId: string
  action: "suspend" | "unsuspend"
  userName: string
}

interface DeleteTarget {
  userId: string
  userName: string
}

// ── constants ─────────────────────────────────────────────────────────────────

const GLOBAL_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "admin", label: ROLE_LABELS.admin },
  { value: "user",  label: ROLE_LABELS.user },
]

const VALID_GLOBAL_ROLES: AppRole[] = ["admin", "user"]

const FILTER_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "admin",    label: ROLE_LABELS.admin },
  { value: "owner",    label: ROLE_LABELS.owner },
  { value: "manager",  label: ROLE_LABELS.manager },
  { value: "employee", label: ROLE_LABELS.employee },
  { value: "coach",    label: ROLE_LABELS.coach },
  { value: "user",     label: ROLE_LABELS.user },
  { value: "partner",  label: ROLE_LABELS.partner },
]

// ── inline confirm dialog ─────────────────────────────────────────────────────

interface ConfirmDialogProps {
  message: string
  confirmLabel: string
  confirmClass: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
  error: string | null
}

function ConfirmDialog({ message, confirmLabel, confirmClass, onConfirm, onCancel, loading, error }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="rounded-2xl bg-card border border-border p-6 w-full max-w-sm shadow-xl">
        <p className="text-sm font-bold text-foreground leading-snug">{message}</p>
        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-100">{error}</p>
        )}
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} disabled={loading} className="flex-1 border border-border rounded-full py-2 text-sm font-bold text-zinc-600 hover:bg-secondary transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading} className={`flex-1 rounded-full py-2 text-sm font-bold text-white transition-colors disabled:opacity-50 ${confirmClass}`}>
            {loading ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── action button helper ──────────────────────────────────────────────────────

function ActionBtn({ label, onClick, variant = "default" }: { label: string; onClick: () => void; variant?: "default" | "danger" }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors ${
        variant === "danger"
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-border text-zinc-600 hover:bg-secondary"
      }`}
    >
      {label}
    </button>
  )
}

// ── main component ────────────────────────────────────────────────────────────

interface AdminUsersViewProps {
  users: UserAdmin[]
  clubs: ClubAdmin[]
}

export function AdminUsersView({ users, clubs }: AdminUsersViewProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [filters, setFilters] = useState<Record<string, string>>({ search: "", role: "" })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [changingRole, setChangingRole] = useState<Record<string, boolean>>({})
  const [roleError, setRoleError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const [suspendTarget, setSuspendTarget] = useState<SuspendTarget | null>(null)
  const [suspendLoading, setSuspendLoading] = useState(false)
  const [suspendError, setSuspendError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function toggleExpand(userId: string) {
    setExpandedId((prev) => (prev === userId ? null : userId))
  }

  const filtered = users.filter((user) => {
    const name = displayName(user)
    const searchLower = filters.search.toLowerCase()
    const matchSearch =
      !filters.search ||
      name.toLowerCase().includes(searchLower) ||
      (user.username ?? "").toLowerCase().includes(searchLower)
    const matchRole = !filters.role || user.global_role === filters.role
    return matchSearch && matchRole
  })

  const filteredIds = filtered.map((u) => u.id)
  const bulk = useBulkSelection(filteredIds)

  async function executeBulkAction(action: "suspend" | "unsuspend" | "delete") {
    if (bulk.selectedCount === 0) return
    setBulkLoading(true)
    setBulkError(null)
    try {
      const res = await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, entity_type: "user", ids: Array.from(bulk.selectedIds) }),
      })
      const json = (await res.json()) as { success: boolean; data: unknown; error: string | null }
      if (!json.success) { setBulkError(json.error ?? "Error al ejecutar la operación masiva"); return }
      bulk.clearSelection()
      startTransition(() => router.refresh())
    } catch {
      setBulkError("Error de conexión. Intenta de nuevo.")
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    if (!(VALID_GLOBAL_ROLES as string[]).includes(newRole)) return
    setChangingRole((prev) => ({ ...prev, [userId]: true }))
    setRoleError(null)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, globalRole: newRole }),
      })
      const json = (await res.json()) as { success: boolean; error?: string | null }
      if (!json.success) { setRoleError(json.error ?? "Error desconocido"); return }
      startTransition(() => router.refresh())
    } catch {
      setRoleError("Error de conexión. Intenta de nuevo.")
    } finally {
      setChangingRole((prev) => ({ ...prev, [userId]: false }))
    }
  }

  async function confirmSuspendAction() {
    if (!suspendTarget) return
    setSuspendLoading(true)
    setSuspendError(null)
    try {
      const res = await fetch(`/api/admin/users/${suspendTarget.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: suspendTarget.action }),
      })
      const json = (await res.json()) as { success: boolean; error?: string | null }
      if (!json.success) { setSuspendError(json.error ?? "Error desconocido"); return }
      setSuspendTarget(null)
      setExpandedId(null)
      startTransition(() => router.refresh())
    } catch {
      setSuspendError("Error de conexión. Intenta de nuevo.")
    } finally {
      setSuspendLoading(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete" }),
      })
      const json = (await res.json()) as { success: boolean; error?: string | null }
      if (!json.success) { setDeleteError(json.error ?? "Error desconocido"); return }
      setDeleteTarget(null)
      setExpandedId(null)
      startTransition(() => router.refresh())
    } catch {
      setDeleteError("Error de conexión. Intenta de nuevo.")
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── columns ──────────────────────────────────────────────────────────────────

  const columns: Column<UserAdmin>[] = [
    {
      key: "expand",
      header: "",
      render: (user) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleExpand(user.id) }}
          className="flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors"
          aria-label={expandedId === user.id ? "Colapsar" : "Expandir"}
        >
          <ChevronRight className={`size-4 transition-transform duration-200 ${expandedId === user.id ? "rotate-90" : ""}`} />
        </button>
      ),
      className: "w-6",
    },
    {
      key: "checkbox",
      header: "",
      render: (user) => (
        <input
          type="checkbox"
          checked={bulk.selectedIds.has(user.id)}
          onChange={() => bulk.toggleOne(user.id)}
          onClick={(e) => e.stopPropagation()}
          className="size-4 rounded border-zinc-300 accent-zinc-900 cursor-pointer"
          aria-label={`Seleccionar ${displayName(user)}`}
        />
      ),
      className: "w-8 shrink-0",
    },
    {
      key: "full_name",
      header: "Nombre",
      render: (user) => {
        const name = displayName(user)
        const suspended = isSuspended(user)
        return (
          <div className="flex items-center gap-3">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-semibold text-zinc-600">{initials(name)}</span>
              </div>
            )}
            <div className="flex flex-col min-w-0 gap-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-foreground truncate">{name}</span>
                {user.is_verified && <BadgeCheck className="size-3.5 text-green-600 shrink-0" aria-label="Verificado" />}
              </div>
              <div className="flex items-center gap-1.5">
                {user.username && <span className="text-[11px] text-zinc-400 truncate">@{user.username}</span>}
                <OriginBadge origin={user.account_origin} />
                {suspended && (
                  <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                    Suspendido
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      key: "city",
      header: "Ciudad",
      render: (user) => <span className="text-zinc-500">{user.city ?? "—"}</span>,
    },
    {
      key: "global_role",
      header: "Rol",
      render: (user) => <RoleBadge role={(user.global_role as AppRole) ?? "user"} size="sm" />,
    },
    {
      key: "rating",
      header: "Stats",
      render: (user) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-zinc-700">{user.rating != null ? `★ ${Number(user.rating).toFixed(1)}` : "—"}</span>
          <span className="text-[10px] text-zinc-400">{user.matches_played != null ? `${user.matches_played} partidos` : ""}</span>
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Miembro Desde",
      render: (user) => <span className="text-zinc-500 text-[11px]">{formatDate(user.created_at)}</span>,
    },
    {
      key: "role_select",
      header: "Rol global",
      render: (user) => (
        <select
          value={user.global_role}
          disabled={changingRole[user.id]}
          onChange={(e) => void handleRoleChange(user.id, e.target.value)}
          className="border border-border rounded-lg px-2 py-1 text-[11px] text-foreground outline-none focus:border-foreground bg-card appearance-none cursor-pointer disabled:opacity-50"
          onClick={(e) => e.stopPropagation()}
        >
          {GLOBAL_ROLE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      ),
    },
    {
      key: "dots",
      header: "",
      render: (user) => {
        const suspended = isSuspended(user)
        const name = displayName(user)
        return (
          <AdminDotsMenu
            items={[
              {
                label: suspended ? "Reactivar" : "Suspender",
                onClick: () => {
                  setSuspendError(null)
                  setSuspendTarget({ userId: user.id, action: suspended ? "unsuspend" : "suspend", userName: name })
                },
              },
              {
                label: "Eliminar",
                variant: "danger",
                onClick: () => {
                  setDeleteError(null)
                  setDeleteTarget({ userId: user.id, userName: name })
                },
              },
            ]}
          />
        )
      },
      className: "flex justify-end",
    },
  ]

  // ── expanded row renderer ─────────────────────────────────────────────────────

  function renderExpandedRow(user: UserAdmin) {
    const name = displayName(user)
    const suspended = isSuspended(user)
    const userInitials = initials(name)

    const chips: string[] = []
    if (user.city) chips.push(user.city)
    if (user.rating != null) chips.push(`★ ${Number(user.rating).toFixed(1)}`)
    if (user.matches_played) chips.push(`${user.matches_played} partidos`)
    if (user.global_role) chips.push(ROLE_LABELS[user.global_role as AppRole] ?? user.global_role)

    const avatar = user.avatar_url ? (
      <img src={user.avatar_url} alt={name} className="w-11 h-11 rounded-xl object-cover" />
    ) : (
      <div className="w-11 h-11 rounded-xl bg-zinc-200 flex items-center justify-center">
        <span className="text-sm font-black text-zinc-600">{userInitials}</span>
      </div>
    )

    const badge = suspended ? (
      <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
        Suspendido
      </span>
    ) : user.is_verified ? (
      <BadgeCheck className="size-3.5 text-green-600" />
    ) : undefined

    return (
      <AdminInlinePanel
        avatar={avatar}
        name={name}
        subtitle={user.username ? `@${user.username}` : "Sin usuario"}
        chips={chips}
        badge={badge}
        actions={
          <>
            <ActionBtn label="Editar" onClick={() => { /* TODO: open edit modal */ }} />
            <ActionBtn
              label={suspended ? "Reactivar" : "Suspender"}
              onClick={() => {
                setSuspendError(null)
                setSuspendTarget({ userId: user.id, action: suspended ? "unsuspend" : "suspend", userName: name })
              }}
            />
            <ActionBtn label="Ver membresía" onClick={() => { /* TODO: memberships */ }} />
            <ActionBtn
              label="Eliminar"
              variant="danger"
              onClick={() => {
                setDeleteError(null)
                setDeleteTarget({ userId: user.id, userName: name })
              }}
            />
          </>
        }
      />
    )
  }

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <FilterBar
            searchPlaceholder="Buscar usuario..."
            filters={[{ key: "role", label: "Todos los roles", options: FILTER_ROLE_OPTIONS }]}
            values={filters}
            onFilterChange={handleFilterChange}
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 bg-foreground text-white rounded-full px-4 py-2 text-sm font-bold hover:bg-foreground/90 transition-colors shrink-0"
        >
          <Plus className="size-4" />Crear cuenta
        </button>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <input
            type="checkbox"
            checked={bulk.isAllSelected}
            ref={(el) => { if (el) el.indeterminate = bulk.isIndeterminate }}
            onChange={() => bulk.toggleAll(filteredIds)}
            className="size-4 rounded border-zinc-300 accent-zinc-900 cursor-pointer"
            aria-label="Seleccionar todos"
          />
          <span className="text-[11px] text-zinc-400 font-semibold">Seleccionar todos ({filtered.length})</span>
        </div>
      )}

      {bulk.selectedCount > 0 && (
        <UserBulkBar
          count={bulk.selectedCount}
          loading={bulkLoading}
          onSuspend={() => void executeBulkAction("suspend")}
          onUnsuspend={() => void executeBulkAction("unsuspend")}
          onDelete={() => setShowBulkDeleteConfirm(true)}
          onClear={bulk.clearSelection}
        />
      )}

      {bulkError && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{bulkError}</div>}

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage="No se encontraron usuarios"
        onRowClick={(user) => toggleExpand(user.id)}
        expandedRowId={expandedId}
        renderExpandedRow={renderExpandedRow}
        gridTemplateColumns="32px 32px 1fr 0.6fr 0.5fr 0.6fr 0.7fr 0.7fr 40px"
      />

      {roleError && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{roleError}</div>}

      {showCreateModal && <CreateUserModal clubs={clubs} onClose={() => setShowCreateModal(false)} />}

      {suspendTarget && (
        <ConfirmDialog
          message={
            suspendTarget.action === "suspend"
              ? `¿Suspender la cuenta de "${suspendTarget.userName}"? El usuario perderá acceso a la plataforma.`
              : `¿Reactivar la cuenta de "${suspendTarget.userName}"? El usuario recuperará su acceso y rol anterior.`
          }
          confirmLabel={suspendTarget.action === "suspend" ? "Suspender" : "Reactivar"}
          confirmClass={suspendTarget.action === "suspend" ? "bg-red-600 hover:bg-red-700" : "bg-foreground hover:bg-foreground/90"}
          onConfirm={() => void confirmSuspendAction()}
          onCancel={() => { if (!suspendLoading) setSuspendTarget(null) }}
          loading={suspendLoading}
          error={suspendError}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`¿Eliminar permanentemente la cuenta de "${deleteTarget.userName}"? Esta acción no se puede deshacer y borrará todos sus datos.`}
          confirmLabel="Eliminar permanentemente"
          confirmClass="bg-red-600 hover:bg-red-700"
          onConfirm={() => void confirmDelete()}
          onCancel={() => { if (!deleteLoading) setDeleteTarget(null) }}
          loading={deleteLoading}
          error={deleteError}
        />
      )}

      <SharedConfirmDialog
        open={showBulkDeleteConfirm}
        onOpenChange={(open) => { if (!open && !bulkLoading) setShowBulkDeleteConfirm(false) }}
        title="¿Eliminar usuarios seleccionados?"
        description={`Esta acción eliminará permanentemente ${bulk.selectedCount} ${bulk.selectedCount === 1 ? "usuario" : "usuarios"}. No se puede deshacer.`}
        confirmLabel="Eliminar todos"
        variant="danger"
        loading={bulkLoading}
        onConfirm={async () => { await executeBulkAction("delete"); setShowBulkDeleteConfirm(false) }}
      />
    </div>
  )
}
