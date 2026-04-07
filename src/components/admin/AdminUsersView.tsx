"use client"

import { useState, useTransition, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { X, ShieldOff, ShieldCheck, UserPlus, Trash2, Building2, BadgeCheck, Plus, Loader2 } from "lucide-react"
import { FilterBar } from "@/components/shared/FilterBar"
import { DataTable } from "@/components/shared/DataTable"
import { RoleBadge } from "@/components/shared/RoleBadge"
import { ConfirmDialog as SharedConfirmDialog } from "@/components/shared/ConfirmDialog"
import { CreateUserModal } from "@/components/admin/CreateUserModal"
import { useBulkSelection } from "@/hooks/useBulkSelection"
import { UserBulkBar } from "@/components/admin/UserBulkBar"
import { ROLE_LABELS } from "@/features/memberships/constants"
import type { Column } from "@/components/shared/DataTable"
import type { UserAdmin, ClubAdmin } from "@/lib/admin/queries"
import type { AppRole, ApiResponse } from "@/types"

// ── constants ─────────────────────────────────────────────────────────────────

const GLOBAL_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "admin", label: ROLE_LABELS.admin },
  { value: "user",  label: ROLE_LABELS.user },
]

const VALID_GLOBAL_ROLES: AppRole[] = ["admin", "user"]

const CLUB_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "owner",    label: ROLE_LABELS.owner },
  { value: "manager",  label: ROLE_LABELS.manager },
  { value: "partner",  label: ROLE_LABELS.partner },
  { value: "coach",    label: ROLE_LABELS.coach },
  { value: "employee", label: ROLE_LABELS.employee },
]

// Filter options include all roles so the table filter still works for existing data
const FILTER_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "admin",    label: ROLE_LABELS.admin },
  { value: "owner",    label: ROLE_LABELS.owner },
  { value: "manager",  label: ROLE_LABELS.manager },
  { value: "employee", label: ROLE_LABELS.employee },
  { value: "coach",    label: ROLE_LABELS.coach },
  { value: "user",     label: ROLE_LABELS.user },
  { value: "partner",  label: ROLE_LABELS.partner },
]

// ── types ─────────────────────────────────────────────────────────────────────

interface ClubMembership {
  club_id: string
  club_name: string | null
  role: string
  is_active: boolean
  joined_at: string
}

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

const ORIGIN_LABELS: Record<string, string> = {
  email:         "Email",
  google:        "Google",
  admin_created: "Admin",
  invite:        "Invitación",
}

function originLabel(origin: string | null): string {
  if (!origin) return "Email"
  return ORIGIN_LABELS[origin] ?? origin
}

function OriginBadge({ origin }: { origin: string | null }) {
  const label = originLabel(origin)
  const colorClass =
    origin === "google"
      ? "bg-white text-[#0a0a0a] border-[#e5e5e5]"
      : origin === "admin_created"
      ? "bg-purple-50 text-purple-700 border-purple-100"
      : origin === "invite"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : "bg-zinc-50 text-zinc-600 border-zinc-200"

  return (
    <span
      className={`inline-flex items-center text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${colorClass}`}
    >
      {label}
    </span>
  )
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

// ── memberships section ───────────────────────────────────────────────────────

interface MembershipsSectionProps {
  userId: string
  clubs: ClubAdmin[]
  onMembershipChange: () => void
}

function MembershipsSection({ userId, clubs, onMembershipChange }: MembershipsSectionProps) {
  const [memberships, setMemberships] = useState<ClubMembership[]>([])
  const [loadingFetch, setLoadingFetch] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [addClubId, setAddClubId] = useState("")
  const [addRole, setAddRole] = useState("owner")
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [removingClubId, setRemovingClubId] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const fetchMemberships = useCallback(async () => {
    setLoadingFetch(true)
    setFetchError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      const json = (await res.json()) as ApiResponse<{
        profile: unknown
        memberships: ClubMembership[]
      }>
      if (!json.success || !json.data) {
        setFetchError(json.error ?? "Error al cargar membresías")
        return
      }
      setMemberships(json.data.memberships.filter((m) => m.is_active))
    } catch {
      setFetchError("Error de conexión al cargar membresías")
    } finally {
      setLoadingFetch(false)
    }
  }, [userId])

  useEffect(() => {
    void fetchMemberships()
  }, [fetchMemberships])

  async function handleAdd() {
    if (!addClubId) {
      setAddError("Selecciona un club")
      return
    }
    setAddLoading(true)
    setAddError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: addClubId, role: addRole }),
      })
      const json = (await res.json()) as ApiResponse<null>
      if (!json.success) {
        setAddError(json.error ?? "Error al agregar membresía")
        return
      }
      setAddClubId("")
      setAddRole("owner")
      await fetchMemberships()
      onMembershipChange()
    } catch {
      setAddError("Error de conexión. Intenta de nuevo.")
    } finally {
      setAddLoading(false)
    }
  }

  async function handleRemove(clubId: string) {
    setRemovingClubId(clubId)
    setRemoveError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/memberships`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId }),
      })
      const json = (await res.json()) as ApiResponse<null>
      if (!json.success) {
        setRemoveError(json.error ?? "Error al eliminar membresía")
        return
      }
      await fetchMemberships()
      onMembershipChange()
    } catch {
      setRemoveError("Error de conexión. Intenta de nuevo.")
    } finally {
      setRemovingClubId(null)
    }
  }

  // Clubs not yet assigned (active memberships excluded)
  const assignedClubIds = new Set(memberships.map((m) => m.club_id))
  const availableClubs = clubs.filter((c) => !assignedClubIds.has(c.id))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Building2 className="size-3.5 text-zinc-400 shrink-0" />
        <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400">
          Membresías de Club
        </p>
      </div>

      {loadingFetch ? (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-9 rounded-xl bg-zinc-100 animate-pulse"
            />
          ))}
        </div>
      ) : fetchError ? (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-100">
          {fetchError}
        </p>
      ) : memberships.length === 0 ? (
        <p className="text-sm text-zinc-400 italic">Sin membresías activas</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {memberships.map((m) => (
            <div
              key={m.club_id}
              className="flex items-center justify-between gap-2 rounded-xl border border-[#e5e5e5] px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-[#0a0a0a] truncate">
                  {m.club_name ?? m.club_id}
                </span>
                <RoleBadge role={m.role as AppRole} size="sm" />
              </div>
              <button
                onClick={() => void handleRemove(m.club_id)}
                disabled={removingClubId === m.club_id}
                title="Eliminar membresía"
                className="size-6 flex items-center justify-center rounded-full hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50 shrink-0"
              >
                {removingClubId === m.club_id ? (
                  <span className="size-3 rounded-full border-2 border-zinc-300 border-t-zinc-500 animate-spin block" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {removeError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-100">
          {removeError}
        </p>
      )}

      {/* Add membership form */}
      {availableClubs.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex gap-2">
            <select
              value={addClubId}
              onChange={(e) => { setAddClubId(e.target.value); setAddError(null) }}
              className="flex-1 min-w-0 border border-[#e5e5e5] rounded-xl px-2.5 py-1.5 text-[11px] text-[#0a0a0a] outline-none focus:border-[#0a0a0a] bg-white appearance-none cursor-pointer"
            >
              <option value="">Seleccionar club…</option>
              {availableClubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value)}
              className="border border-[#e5e5e5] rounded-xl px-2.5 py-1.5 text-[11px] text-[#0a0a0a] outline-none focus:border-[#0a0a0a] bg-white appearance-none cursor-pointer"
            >
              {CLUB_ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {addError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-100">
              {addError}
            </p>
          )}
          <button
            onClick={() => void handleAdd()}
            disabled={addLoading || !addClubId}
            className="flex items-center justify-center gap-1.5 w-full border border-[#e5e5e5] rounded-full py-2 text-[11px] font-bold text-[#0a0a0a] hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            {addLoading ? (
              "Agregando…"
            ) : (
              <>
                <UserPlus className="size-3.5" />
                Agregar membresía
              </>
            )}
          </button>
        </div>
      )}

      {availableClubs.length === 0 && !loadingFetch && memberships.length > 0 && (
        <p className="text-[11px] text-zinc-400 italic">
          Usuario asignado a todos los clubes disponibles
        </p>
      )}
    </div>
  )
}

// ── verification section ──────────────────────────────────────────────────────

interface VerificationSectionProps {
  user: UserAdmin
  onVerified: () => void
}

function VerificationSection({ user, onVerified }: VerificationSectionProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleVerify() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify" }),
      })
      const json = (await res.json()) as { success: boolean; error?: string | null }
      if (!json.success) {
        setError(json.error ?? "Error al verificar")
        return
      }
      onVerified()
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <BadgeCheck className="size-3.5 text-zinc-400 shrink-0" />
        <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400">
          Verificación
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-[#e5e5e5] px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-zinc-500">Estado</span>
          {user.is_verified ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              <BadgeCheck className="size-3" />
              Verificado
            </span>
          ) : (
            <span className="text-[11px] font-bold text-zinc-400 bg-zinc-100 border border-zinc-200 rounded-full px-2 py-0.5">
              No verificado
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-zinc-500">Origen</span>
          <OriginBadge origin={user.account_origin} />
        </div>

        {user.verified_at && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-zinc-500">Verificado el</span>
            <span className="text-[11px] text-zinc-700">{formatDate(user.verified_at)}</span>
          </div>
        )}
      </div>

      {!user.is_verified && (
        <>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-100">
              {error}
            </p>
          )}
          <button
            onClick={() => void handleVerify()}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 w-full border border-green-200 text-green-700 rounded-full py-2 text-[11px] font-bold hover:bg-green-50 transition-colors disabled:opacity-50"
          >
            {loading ? (
              "Verificando…"
            ) : (
              <>
                <BadgeCheck className="size-3.5" />
                Verificar manualmente
              </>
            )}
          </button>
        </>
      )}
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
  clubs: ClubAdmin[]
  onClose: () => void
  onSuspendRequest: (target: SuspendTarget) => void
  onDeleteRequest: (target: DeleteTarget) => void
  onMembershipChange: () => void
  onVerified: () => void
}

function UserDetailPanel({
  user,
  clubs,
  onClose,
  onSuspendRequest,
  onDeleteRequest,
  onMembershipChange,
  onVerified,
}: UserDetailPanelProps) {
  const name         = displayName(user)
  const suspended    = isSuspended(user)
  const userInitials = initials(name)
  const role         = (user.global_role as AppRole) ?? "user"

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

          {/* Profile fields */}
          <div className="flex flex-col gap-3">
            <FieldRow label="Rol global" value={<RoleBadge role={role} size="sm" />} />
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

          {/* Divider */}
          <div className="border-t border-[#f0f0f0]" />

          {/* Verification */}
          <VerificationSection user={user} onVerified={onVerified} />

          {/* Divider */}
          <div className="border-t border-[#f0f0f0]" />

          {/* Club memberships */}
          <MembershipsSection
            userId={user.id}
            clubs={clubs}
            onMembershipChange={onMembershipChange}
          />
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
  clubs: ClubAdmin[]
}

export function AdminUsersView({ users, clubs }: AdminUsersViewProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [filters, setFilters] = useState<Record<string, string>>({
    search: "",
    role: "",
  })
  const [changingRole, setChangingRole] = useState<Record<string, boolean>>({})
  const [roleError, setRoleError] = useState<string | null>(null)

  // Create user modal
  const [showCreateModal, setShowCreateModal] = useState(false)

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

  // Bulk actions
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

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
        body: JSON.stringify({
          action,
          entity_type: "user",
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
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-[#0a0a0a] truncate">{name}</span>
                {user.is_verified && (
                  <BadgeCheck className="size-3.5 text-green-600 shrink-0" aria-label="Verificado" />
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {user.username && (
                  <span className="text-[11px] text-zinc-400 truncate">@{user.username}</span>
                )}
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
      header: "Rol global",
      render: (user) => (
        <select
          value={user.global_role}
          disabled={changingRole[user.id]}
          onChange={(e) => void handleRoleChange(user.id, e.target.value)}
          className="border border-[#e5e5e5] rounded-lg px-2 py-1 text-[11px] text-[#0a0a0a] outline-none focus:border-[#0a0a0a] bg-white appearance-none cursor-pointer disabled:opacity-50"
          onClick={(e) => e.stopPropagation()}
        >
          {GLOBAL_ROLE_OPTIONS.map((opt) => (
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
      {/* Toolbar: filters + create button */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <FilterBar
            searchPlaceholder="Buscar usuario..."
            filters={[
              {
                key: "role",
                label: "Todos los roles",
                options: FILTER_ROLE_OPTIONS,
              },
            ]}
            values={filters}
            onFilterChange={handleFilterChange}
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 bg-[#0a0a0a] text-white rounded-full px-4 py-2 text-sm font-bold hover:bg-zinc-800 transition-colors shrink-0"
        >
          <Plus className="size-4" />
          Crear cuenta
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
            aria-label="Seleccionar todos"
          />
          <span className="text-[11px] text-zinc-400 font-semibold">
            Seleccionar todos ({filtered.length})
          </span>
        </div>
      )}

      {/* Bulk action bar */}
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

      {bulkError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {bulkError}
        </div>
      )}

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
          clubs={clubs}
          onClose={() => setSelectedUser(null)}
          onSuspendRequest={handleSuspendRequest}
          onDeleteRequest={(target) => { setDeleteError(null); setDeleteTarget(target) }}
          onMembershipChange={() => startTransition(() => router.refresh())}
          onVerified={() => { setSelectedUser(null); startTransition(() => router.refresh()) }}
        />
      )}

      {/* Create user modal */}
      {showCreateModal && (
        <CreateUserModal
          clubs={clubs}
          onClose={() => setShowCreateModal(false)}
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
          onConfirm={() => void confirmSuspendAction()}
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
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            if (!deleteLoading) setDeleteTarget(null)
          }}
          loading={deleteLoading}
          error={deleteError}
        />
      )}

      {/* Bulk delete confirm dialog */}
      <SharedConfirmDialog
        open={showBulkDeleteConfirm}
        onOpenChange={(open) => {
          if (!open && !bulkLoading) setShowBulkDeleteConfirm(false)
        }}
        title="¿Eliminar usuarios seleccionados?"
        description={`Esta acción eliminará permanentemente ${bulk.selectedCount} ${bulk.selectedCount === 1 ? "usuario" : "usuarios"}. No se puede deshacer.`}
        confirmLabel="Eliminar todos"
        variant="danger"
        loading={bulkLoading}
        onConfirm={async () => {
          await executeBulkAction("delete")
          setShowBulkDeleteConfirm(false)
        }}
      />
    </div>
  )
}
