"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { X, ShieldOff, ShieldCheck } from "lucide-react"
import { FilterBar } from "@/components/shared/FilterBar"
import { DataTable } from "@/components/shared/DataTable"
import { RoleBadge } from "@/components/shared/RoleBadge"
import { ROLE_LABELS } from "@/lib/roles"
import type { Column } from "@/components/shared/DataTable"
import type { UserAdmin } from "@/lib/admin/queries"
import type { AppRole } from "@/types"

// ── constants ─────────────────────────────────────────────────────────────────

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "admin",    label: ROLE_LABELS.admin },
  { value: "owner",    label: ROLE_LABELS.owner },
  { value: "manager",  label: ROLE_LABELS.manager },
  { value: "employee", label: ROLE_LABELS.employee },
  { value: "coach",    label: ROLE_LABELS.coach },
  { value: "user",     label: ROLE_LABELS.user },
  { value: "partner",  label: ROLE_LABELS.partner },
]

const VALID_ROLES: AppRole[] = [
  "admin", "owner", "partner", "manager", "employee", "coach", "user",
]

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function isSuspended(user: UserAdmin): boolean {
  return typeof user.settings?.suspended_from_role === "string"
}

function displayName(user: UserAdmin): string {
  return (
    user.full_name ||
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    "—"
  )
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
}

// ── confirm dialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  message: string
  confirmLabel: string
  confirmClass: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
  error: string | null
}

function ConfirmDialog({
  message,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
  loading,
  error,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6 w-full max-w-sm shadow-xl">
        <p className="text-sm font-bold text-[#0a0a0a] leading-snug">{message}</p>
        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-100">
            {error}
          </p>
        )}
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 border border-[#e5e5e5] rounded-full py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-full py-2 text-sm font-bold text-white transition-colors disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── user detail slide-over ────────────────────────────────────────────────────

interface SuspendTarget {
  userId: string
  action: "suspend" | "unsuspend"
  userName: string
}

interface DeleteTarget {
  userId: string
  userName: string
}

interface UserDetailPanelProps {
  user: UserAdmin
  onClose: () => void
  onSuspendRequest: (target: SuspendTarget) => void
  onDeleteRequest: (target: DeleteTarget) => void
}

function UserDetailPanel({ user, onClose, onSuspendRequest, onDeleteRequest }: UserDetailPanelProps) {
  const name        = displayName(user)
  const suspended   = isSuspended(user)
  const userInitials = initials(name)
  const role = (user.global_role as AppRole) ?? "user"

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white border-l border-[#e5e5e5] z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0]">
          <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400">
            Detalle de usuario
          </p>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors"
          >
            <X className="size-4 text-zinc-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={name}
                className="size-14 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="size-14 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                <span className="text-base font-black text-zinc-600">{userInitials}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-base font-black text-[#0a0a0a] truncate">{name}</p>
              {user.username && (
                <p className="text-sm text-zinc-400">@{user.username}</p>
              )}
            </div>
          </div>

          {/* Suspended badge */}
          {suspended && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
              <ShieldOff className="size-4 text-red-500 shrink-0" />
              <p className="text-sm font-bold text-red-600">Cuenta suspendida</p>
            </div>
          )}

          {/* Fields */}
          <div className="flex flex-col gap-3">
            <FieldRow label="Rol" value={<RoleBadge role={role} size="sm" />} />
            <FieldRow label="Ciudad" value={user.city ?? "—"} />
            <FieldRow label="Provincia" value={user.province ?? "—"} />
            <FieldRow label="Miembro desde" value={formatDate(user.created_at)} />
            {user.rating != null && (
              <FieldRow label="Rating" value={`★ ${Number(user.rating).toFixed(1)}`} />
            )}
            {user.matches_played != null && (
              <FieldRow label="Partidos jugados" value={String(user.matches_played)} />
            )}
          </div>
        </div>

        {/* Footer — suspend / reactivate / delete */}
        <div className="px-5 py-4 border-t border-[#f0f0f0] flex flex-col gap-2">
          {suspended ? (
            <button
              onClick={() =>
                onSuspendRequest({ userId: user.id, action: "unsuspend", userName: name })
              }
              className="w-full flex items-center justify-center gap-2 bg-[#0a0a0a] text-white rounded-full py-2.5 text-sm font-bold hover:bg-zinc-800 transition-colors"
            >
              <ShieldCheck className="size-4" />
              Reactivar cuenta
            </button>
          ) : (
            <button
              onClick={() =>
                onSuspendRequest({ userId: user.id, action: "suspend", userName: name })
              }
              className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 rounded-full py-2.5 text-sm font-bold hover:bg-red-50 transition-colors"
            >
              <ShieldOff className="size-4" />
              Suspender cuenta
            </button>
          )}
          <button
            onClick={() => onDeleteRequest({ userId: user.id, userName: name })}
            className="w-full flex items-center justify-center gap-2 bg-red-600 text-white rounded-full py-2.5 text-sm font-bold hover:bg-red-700 transition-colors"
          >
            <X className="size-4" />
            Eliminar cuenta permanentemente
          </button>
        </div>
      </div>
    </>
  )
}

function FieldRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-[#f8f8f8]">
      <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400 shrink-0">{label}</p>
      <div className="text-sm font-medium text-[#0a0a0a] text-right">{value}</div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

interface AdminUsersViewProps {
  users: UserAdmin[]
}

export function AdminUsersView({ users }: AdminUsersViewProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [filters, setFilters] = useState<Record<string, string>>({
    search: "",
    role: "",
  })
  const [changingRole, setChangingRole] = useState<Record<string, boolean>>({})
  const [roleError, setRoleError] = useState<string | null>(null)

  // Detail panel
  const [selectedUser, setSelectedUser] = useState<UserAdmin | null>(null)

  // Suspend confirm
  const [suspendTarget, setSuspendTarget] = useState<SuspendTarget | null>(null)
  const [suspendLoading, setSuspendLoading] = useState(false)
  const [suspendError, setSuspendError] = useState<string | null>(null)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
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

  async function handleRoleChange(userId: string, newRole: string) {
    if (!(VALID_ROLES as string[]).includes(newRole)) return
    setChangingRole((prev) => ({ ...prev, [userId]: true }))
    setRoleError(null)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, globalRole: newRole }),
      })
      const json = (await res.json()) as { success: boolean; error?: string | null }
      if (!json.success) {
        setRoleError(json.error ?? "Error desconocido")
        return
      }
      startTransition(() => router.refresh())
    } catch {
      setRoleError("Error de conexión. Intenta de nuevo.")
    } finally {
      setChangingRole((prev) => ({ ...prev, [userId]: false }))
    }
  }

  function handleSuspendRequest(target: SuspendTarget) {
    setSuspendError(null)
    setSuspendTarget(target)
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
      if (!json.success) {
        setSuspendError(json.error ?? "Error desconocido")
        return
      }
      setSuspendTarget(null)
      setSelectedUser(null)
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
      if (!json.success) {
        setDeleteError(json.error ?? "Error desconocido")
        return
      }
      setDeleteTarget(null)
      setSelectedUser(null)
      startTransition(() => router.refresh())
    } catch {
      setDeleteError("Error de conexión. Intenta de nuevo.")
    } finally {
      setDeleteLoading(false)
    }
  }

  const columns: Column<UserAdmin>[] = [
    {
      key: "full_name",
      header: "Nombre",
      render: (user) => {
        const name = displayName(user)
        const suspended = isSuspended(user)
        return (
          <div className="flex items-center gap-3">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={name}
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-semibold text-zinc-600">{initials(name)}</span>
              </div>
            )}
            <div className="flex flex-col min-w-0 gap-0.5">
              <span className="font-bold text-[#0a0a0a] truncate">{name}</span>
              <div className="flex items-center gap-1.5">
                {user.username && (
                  <span className="text-[11px] text-zinc-400 truncate">@{user.username}</span>
                )}
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
      render: (user) => (
        <span className="text-zinc-500">{user.city ?? "—"}</span>
      ),
    },
    {
      key: "global_role",
      header: "Rol",
      render: (user) => {
        const role = (user.global_role as AppRole) ?? "user"
        return <RoleBadge role={role} size="sm" />
      },
    },
    {
      key: "rating",
      header: "Stats",
      render: (user) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-zinc-700">
            {user.rating != null ? `★ ${Number(user.rating).toFixed(1)}` : "—"}
          </span>
          <span className="text-[10px] text-zinc-400">
            {user.matches_played != null ? `${user.matches_played} partidos` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Miembro Desde",
      render: (user) => (
        <span className="text-zinc-500 text-[11px]">{formatDate(user.created_at)}</span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      render: (user) => (
        <select
          value={user.global_role}
          disabled={changingRole[user.id]}
          onChange={(e) => handleRoleChange(user.id, e.target.value)}
          className="border border-[#e5e5e5] rounded-lg px-2 py-1 text-[11px] text-[#0a0a0a] outline-none focus:border-[#0a0a0a] bg-white appearance-none cursor-pointer disabled:opacity-50"
          onClick={(e) => e.stopPropagation()}
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <FilterBar
        searchPlaceholder="Buscar usuario..."
        filters={[
          {
            key: "role",
            label: "Todos los roles",
            options: ROLE_OPTIONS,
          },
        ]}
        values={filters}
        onFilterChange={handleFilterChange}
      />

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage="No se encontraron usuarios"
        onRowClick={(user) => setSelectedUser(user)}
      />

      {roleError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {roleError}
        </div>
      )}

      {/* User detail slide-over */}
      {selectedUser && (
        <UserDetailPanel
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSuspendRequest={handleSuspendRequest}
          onDeleteRequest={(target) => { setDeleteError(null); setDeleteTarget(target) }}
        />
      )}

      {/* Suspend / unsuspend confirm dialog */}
      {suspendTarget && (
        <ConfirmDialog
          message={
            suspendTarget.action === "suspend"
              ? `¿Suspender la cuenta de "${suspendTarget.userName}"? El usuario perderá acceso a la plataforma.`
              : `¿Reactivar la cuenta de "${suspendTarget.userName}"? El usuario recuperará su acceso y rol anterior.`
          }
          confirmLabel={suspendTarget.action === "suspend" ? "Suspender" : "Reactivar"}
          confirmClass={
            suspendTarget.action === "suspend"
              ? "bg-red-600 hover:bg-red-700"
              : "bg-[#0a0a0a] hover:bg-zinc-800"
          }
          onConfirm={confirmSuspendAction}
          onCancel={() => {
            if (!suspendLoading) setSuspendTarget(null)
          }}
          loading={suspendLoading}
          error={suspendError}
        />
      )}

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <ConfirmDialog
          message={`¿Eliminar permanentemente la cuenta de "${deleteTarget.userName}"? Esta acción no se puede deshacer y borrará todos sus datos.`}
          confirmLabel="Eliminar permanentemente"
          confirmClass="bg-red-600 hover:bg-red-700"
          onConfirm={confirmDelete}
          onCancel={() => {
            if (!deleteLoading) setDeleteTarget(null)
          }}
          loading={deleteLoading}
          error={deleteError}
        />
      )}
    </div>
  )
}
