# Admin Tables Inline Expand — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar las 6 páginas de tablas admin con patrón unificado de inline expand (fila clickeable que despliega panel de detalle con acciones) y toolbar estandarizado.

**Architecture:** Dos componentes shared nuevos (AdminDotsMenu, AdminInlinePanel) + extensión mínima de DataTable (props `expandedRowId` + `renderExpandedRow` + `gridTemplateColumns`). Cada view administra su propio `expandedId: string | null`. Se elimina el slide-over `UserDetailPanel`.

**Tech Stack:** Next.js 16 App Router, React 18, TypeScript 5, Tailwind CSS 4, shadcn/ui (@base-ui/react)

---

## File Map

| Acción | Archivo |
|--------|---------|
| Crear | `src/components/admin/shared/AdminDotsMenu.tsx` |
| Crear | `src/components/admin/shared/AdminInlinePanel.tsx` |
| Modificar | `src/components/shared/DataTable.tsx` |
| Modificar | `src/components/admin/AdminUsersView.tsx` |
| Modificar | `src/components/admin/AdminClubsView.tsx` |
| Modificar | `src/features/activities/components/AdminEventsView.tsx` |
| Modificar | `src/components/admin/AdminTournamentsView.tsx` |
| Modificar | `src/components/admin/AdminInvitesView.tsx` |
| Modificar | `src/components/admin/AdminReservationsView.tsx` |
| Eliminar | `src/components/admin/user-detail/UserDetailPanel.tsx` |
| Eliminar | `src/components/admin/user-detail/MembershipsSection.tsx` |
| Eliminar | `src/components/admin/user-detail/VerificationSection.tsx` |
| Eliminar | `src/components/admin/user-detail/BadgesSection.tsx` |
| Mantener | `src/components/admin/user-detail/helpers.ts` |
| Mantener | `src/components/admin/user-detail/OriginBadge.tsx` |

---

## Task 1: AdminDotsMenu — Componente ⋯ reutilizable

**Files:**
- Create: `src/components/admin/shared/AdminDotsMenu.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
"use client"

import { useRef, useEffect, useState } from "react"

interface DotsMenuItem {
  label: string
  onClick: () => void
  variant?: "default" | "danger"
  disabled?: boolean
}

interface AdminDotsMenuProps {
  items: DotsMenuItem[]
}

export function AdminDotsMenu({ items }: AdminDotsMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Más acciones"
        className="size-[26px] flex items-center justify-center rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-500 hover:text-foreground hover:border-zinc-300 transition-colors text-[16px] leading-none"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg py-1 min-w-[140px]">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => { item.onClick(); setOpen(false) }}
              disabled={item.disabled}
              className={`w-full text-left px-3 py-2 text-[12px] font-semibold transition-colors disabled:opacity-40 ${
                item.variant === "danger"
                  ? "text-red-600 hover:bg-red-50"
                  : "text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar que TypeScript no arroja errores**

```bash
cd /home/reu/Escritorio/MATCHPOINT && npx tsc --noEmit 2>&1 | grep AdminDotsMenu
```
Expected: sin output (sin errores).

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/shared/AdminDotsMenu.tsx
git commit -m "feat(admin): add AdminDotsMenu shared component"
```

---

## Task 2: AdminInlinePanel — Shell del panel expandido

**Files:**
- Create: `src/components/admin/shared/AdminInlinePanel.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import type { ReactNode } from "react"

interface AdminInlinePanelProps {
  avatar: ReactNode
  name: string
  subtitle: string
  chips?: string[]
  actions: ReactNode
  badge?: ReactNode
}

export function AdminInlinePanel({
  avatar,
  name,
  subtitle,
  chips,
  actions,
  badge,
}: AdminInlinePanelProps) {
  return (
    <div className="bg-[#f0f6ff] border-b border-[#e5e7eb] px-5 py-4">
      <div className="flex items-start gap-4">
        <div className="shrink-0">{avatar}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black text-foreground leading-tight">{name}</p>
            {badge}
          </div>
          <p className="text-[12px] text-zinc-500 mt-0.5">{subtitle}</p>
          {chips && chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-600"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">{actions}</div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /home/reu/Escritorio/MATCHPOINT && npx tsc --noEmit 2>&1 | grep AdminInlinePanel
```
Expected: sin output.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/shared/AdminInlinePanel.tsx
git commit -m "feat(admin): add AdminInlinePanel shared component"
```

---

## Task 3: DataTable — agregar soporte de expand row

**Files:**
- Modify: `src/components/shared/DataTable.tsx`

- [ ] **Step 1: Reemplazar el archivo completo**

```tsx
"use client"

export interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T extends { id?: string }> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  onRowClick?: (item: T) => void
  keyExtractor?: (item: T) => string
  expandedRowId?: string | null
  renderExpandedRow?: (item: T) => React.ReactNode
  gridTemplateColumns?: string
}

export function DataTable<T extends { id?: string }>({
  columns,
  data,
  emptyMessage = "Sin datos",
  onRowClick,
  keyExtractor,
  expandedRowId,
  renderExpandedRow,
  gridTemplateColumns,
}: DataTableProps<T>) {
  const getKey = keyExtractor ?? ((item: T) => item.id ?? String(Math.random()))
  const gridCols = gridTemplateColumns ?? `repeat(${columns.length}, minmax(0, 1fr))`

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div
        className="grid border-b border-border px-5 py-3 bg-muted"
        style={{ gridTemplateColumns: gridCols }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className={`text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 ${col.className ?? ""}`}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-border-subtle">
        {data.length === 0 ? (
          <div className="flex items-center justify-center py-14">
            <p className="text-sm font-bold text-zinc-400">{emptyMessage}</p>
          </div>
        ) : (
          data.map((item, i) => {
            const key = getKey(item)
            const isExpanded = expandedRowId != null && expandedRowId === key
            return (
              <div key={key}>
                <div
                  className={`animate-fade-in grid px-5 py-3.5 items-center transition-colors duration-150 ${
                    onRowClick ? "cursor-pointer hover:bg-zinc-50" : ""
                  } ${isExpanded ? "bg-[#f8faff]" : ""}`}
                  style={{
                    gridTemplateColumns: gridCols,
                    animationDelay: `${i * 0.03}s`,
                  }}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col) => (
                    <div
                      key={col.key}
                      className={`text-sm text-foreground ${col.className ?? ""}`}
                    >
                      {col.render
                        ? col.render(item)
                        : String((item as Record<string, unknown>)[col.key] ?? "—")}
                    </div>
                  ))}
                </div>
                {isExpanded && renderExpandedRow?.(item)}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /home/reu/Escritorio/MATCHPOINT && npx tsc --noEmit 2>&1 | grep DataTable
```
Expected: sin output.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/DataTable.tsx
git commit -m "feat(shared): extend DataTable with expandedRowId + renderExpandedRow"
```

---

## Task 4: AdminUsersView — inline expand, eliminar slide-over

**Files:**
- Modify: `src/components/admin/AdminUsersView.tsx`

El cambio principal: remover `UserDetailPanel` (slide-over), inline `SuspendTarget`/`DeleteTarget` types, agregar `expandedId` state, columna ▶ y ⋯, y `renderExpandedRow` con `AdminInlinePanel`.

- [ ] **Step 1: Reemplazar el archivo completo**

```tsx
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
        subtitle={user.email ?? "Sin email"}
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
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /home/reu/Escritorio/MATCHPOINT && npx tsc --noEmit 2>&1 | grep AdminUsersView
```
Expected: sin output.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminUsersView.tsx
git commit -m "feat(admin): AdminUsersView — inline expand, remove UserDetailPanel slide-over"
```

---

## Task 5: AdminClubsView — inline expand

**Files:**
- Modify: `src/components/admin/AdminClubsView.tsx`

Agregar: imports de `ChevronRight`, `AdminDotsMenu`, `AdminInlinePanel`; estado `expandedId`; columna ▶ primera; columna ⋯ última; `renderExpandedRow`. Quitar botones inline de acciones de la columna `actions` existente (se mueven al panel expandido y al ⋯).

- [ ] **Step 1: Reemplazar el bloque de imports y la función principal**

El archivo tiene ~715 líneas. Reemplazar el **bloque de imports** al inicio (líneas 1–15) con:

```tsx
"use client"

import { useState, useTransition, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2, X, Plus, ChevronRight } from "lucide-react"
import { FilterBar } from "@/components/shared/FilterBar"
import { DataTable } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { AdminDotsMenu } from "@/components/admin/shared/AdminDotsMenu"
import { AdminInlinePanel } from "@/components/admin/shared/AdminInlinePanel"
import { useBulkSelection } from "@/hooks/useBulkSelection"
import { ClubBulkBar } from "@/components/admin/ClubBulkBar"
import { ECUADOR_PROVINCES } from "@/lib/constants"
import type { Column } from "@/components/shared/DataTable"
import type { ClubAdmin } from "@/lib/admin/queries"
```

- [ ] **Step 2: Agregar estado `expandedId` en `AdminClubsView`**

Dentro de `AdminClubsView`, después de `const [modal, setModal] = useState<ModalState>({ type: "none" })`:

```tsx
const [expandedId, setExpandedId] = useState<string | null>(null)

function toggleExpand(clubId: string) {
  setExpandedId((prev) => (prev === clubId ? null : clubId))
}
```

- [ ] **Step 3: Reemplazar el array `columns` existente**

Reemplazar el bloque `const columns: Column<ClubAdmin>[] = [...]` completo con:

```tsx
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
```

- [ ] **Step 4: Agregar función `renderExpandedRow` antes del return**

```tsx
function renderExpandedRow(club: ClubAdmin) {
  const chips: string[] = []
  if (club.province) chips.push(club.province)
  if (club.members_count) chips.push(`${club.members_count} miembros`)
  if (club.courts_count) chips.push(`${club.courts_count} canchas`)

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
```

- [ ] **Step 5: Actualizar el `<DataTable>` en el return**

Reemplazar el `<DataTable ... />` existente con:

```tsx
<DataTable
  columns={columns}
  data={filtered}
  emptyMessage="No se encontraron clubs"
  onRowClick={(club) => toggleExpand(club.id)}
  expandedRowId={expandedId}
  renderExpandedRow={renderExpandedRow}
  gridTemplateColumns="32px 32px 1fr 0.7fr 0.5fr 0.5fr 0.6fr 40px"
/>
```

- [ ] **Step 6: Verificar TypeScript**

```bash
cd /home/reu/Escritorio/MATCHPOINT && npx tsc --noEmit 2>&1 | grep AdminClubsView
```
Expected: sin output.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/AdminClubsView.tsx
git commit -m "feat(admin): AdminClubsView — inline expand pattern"
```

---

## Task 6: AdminEventsView — inline expand + toolbar estandarizado

**Files:**
- Modify: `src/features/activities/components/AdminEventsView.tsx`

AdminEventsView tiene su propio `FilterBar` local (no el shared). Lo reemplazaremos con el `FilterBar` de shared. También usa un render de tabla propio (no DataTable). Agregaremos DataTable + inline expand.

- [ ] **Step 1: Leer el archivo completo para entender la estructura actual**

```bash
cat /home/reu/Escritorio/MATCHPOINT/src/features/activities/components/AdminEventsView.tsx
```

- [ ] **Step 2: Reemplazar imports al inicio del archivo**

```tsx
"use client"

import { useState } from "react"
import { Plus, ChevronRight } from "lucide-react"
import { useEventMutations } from "@/features/activities/hooks/useEventMutations"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { FilterBar } from "@/components/shared/FilterBar"
import { DataTable } from "@/components/shared/DataTable"
import { AdminDotsMenu } from "@/components/admin/shared/AdminDotsMenu"
import { AdminInlinePanel } from "@/components/admin/shared/AdminInlinePanel"
import { EventFormModal, EMPTY_EVENT_FORM } from "@/features/activities/components/EventForm"
import { EVENT_TYPE_CONFIG, EVENT_STATUS_CONFIG, SPORT_LABELS } from "@/features/activities/constants"
import { CalendarDays, CheckCircle, Globe } from "lucide-react"
import type { Column } from "@/components/shared/DataTable"
import type { EventWithClub, EventType, EventStatus } from "@/features/activities/types"
import type { EventFormState } from "@/features/activities/components/EventForm"
import { eventToForm } from "@/features/activities/utils"
```

- [ ] **Step 3: Agregar `expandedId` state y `toggleExpand` dentro de `AdminEventsView`**

Después de las líneas de estado de `modal`, agregar:

```tsx
const [expandedId, setExpandedId] = useState<string | null>(null)
const [filters, setFilters] = useState<Record<string, string>>({ search: "", status: "" })

function toggleExpand(eventId: string) {
  setExpandedId((prev) => (prev === eventId ? null : eventId))
}

function handleFilterChange(key: string, value: string) {
  setFilters((prev) => ({ ...prev, [key]: value }))
}
```

- [ ] **Step 4: Actualizar el filtrado para usar el nuevo estado `filters`**

Reemplazar el bloque `const filtered = events.filter(...)` que usa `textFilter` y `statusFilter` con:

```tsx
const filtered = events.filter((e) => {
  const matchText   = !filters.search   || e.title.toLowerCase().includes(filters.search.toLowerCase())
  const matchStatus = !filters.status || e.status === filters.status
  return matchText && matchStatus
})
```

- [ ] **Step 5: Agregar definición de `columns` antes del return**

```tsx
const STATUS_FILTER_OPTIONS = [
  { value: "draft", label: "Borrador" },
  { value: "published", label: "Publicado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "completed", label: "Completado" },
]

const columns: Column<EventWithClub>[] = [
  {
    key: "expand",
    header: "",
    render: (event) => (
      <button
        onClick={(e) => { e.stopPropagation(); toggleExpand(event.id) }}
        className="flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors"
        aria-label={expandedId === event.id ? "Colapsar" : "Expandir"}
      >
        <ChevronRight className={`size-4 transition-transform duration-200 ${expandedId === event.id ? "rotate-90" : ""}`} />
      </button>
    ),
    className: "w-6",
  },
  {
    key: "title",
    header: "Título",
    render: (event) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-bold text-foreground">{event.title}</span>
        {event.club_name && <span className="text-[11px] text-zinc-400">{event.club_name}</span>}
      </div>
    ),
  },
  {
    key: "event_type",
    header: "Tipo",
    render: (event) => {
      const cfg = EVENT_TYPE_CONFIG[event.event_type as EventType]
      return (
        <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${cfg?.className ?? "bg-muted text-zinc-600"}`}>
          {cfg?.label ?? event.event_type}
        </span>
      )
    },
  },
  {
    key: "status",
    header: "Estado",
    render: (event) => {
      const cfg = EVENT_STATUS_CONFIG[event.status as EventStatus]
      return (
        <StatusBadge
          label={cfg?.label ?? event.status}
          variant={cfg?.variant ?? "neutral"}
        />
      )
    },
  },
  {
    key: "start_date",
    header: "Fecha",
    render: (event) => (
      <span className="text-[11px] text-zinc-500">
        {event.start_date ? formatDate(event.start_date) : "—"}
      </span>
    ),
  },
  {
    key: "registration_count",
    header: "Inscritos",
    render: (event) => (
      <span className="font-semibold">{event.registration_count}</span>
    ),
  },
  {
    key: "dots",
    header: "",
    render: (event) => {
      const isTerminal = event.status === "cancelled" || event.status === "completed"
      return (
        <AdminDotsMenu
          items={[
            {
              label: "Editar",
              disabled: isTerminal,
              onClick: () => openEdit(event),
            },
            {
              label: "Ver inscritos",
              onClick: () => { /* TODO: navigate to registrations */ },
            },
            {
              label: "Cancelar evento",
              variant: "danger",
              disabled: isTerminal,
              onClick: () => mutations.requestCancel(event.id, event.title),
            },
          ]}
        />
      )
    },
    className: "flex justify-end",
  },
]
```

- [ ] **Step 6: Agregar `renderExpandedRow` antes del return**

```tsx
function renderExpandedRow(event: EventWithClub) {
  const cfg = EVENT_STATUS_CONFIG[event.status as EventStatus]
  const isTerminal = event.status === "cancelled" || event.status === "completed"

  const chips: string[] = []
  if (event.club_name) chips.push(event.club_name)
  if (event.sport) chips.push(SPORT_LABELS[event.sport] ?? event.sport)
  if (event.registration_count > 0) chips.push(`${event.registration_count} inscritos`)
  if (event.price != null) chips.push(event.price === 0 ? "Gratis" : `$${event.price}`)

  const avatar = (
    <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center">
      <CalendarDays className="size-5 text-purple-600" />
    </div>
  )

  const badge = cfg ? (
    <StatusBadge label={cfg.label} variant={cfg.variant} />
  ) : undefined

  return (
    <AdminInlinePanel
      avatar={avatar}
      name={event.title}
      subtitle={event.start_date ? formatDate(event.start_date) : "Sin fecha"}
      chips={chips}
      badge={badge}
      actions={
        <>
          {!isTerminal && (
            <button
              onClick={() => openEdit(event)}
              className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-border text-zinc-600 hover:bg-secondary transition-colors"
            >
              Editar
            </button>
          )}
          <button
            className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-border text-zinc-600 hover:bg-secondary transition-colors"
          >
            Ver inscritos
          </button>
          {!isTerminal && (
            <button
              onClick={() => mutations.requestCancel(event.id, event.title)}
              className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              Cancelar evento
            </button>
          )}
        </>
      }
    />
  )
}
```

- [ ] **Step 7: Reemplazar el JSX del return con el nuevo toolbar + DataTable**

En el `return (...)`, reemplazar el toolbar local y la tabla con:

```tsx
return (
  <div className="flex flex-col gap-5">
    {/* Stats */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Total Eventos"  value={total}     icon={CalendarDays}  variant="default" />
      <StatCard label="Publicados"     value={published} icon={Globe}         variant="success" />
      <StatCard label="Cancelados"     value={cancelled} icon={CheckCircle}   variant="warning" />
      <StatCard label="Inscripciones"  value={totalRegs} icon={CheckCircle}   variant="accent" />
    </div>

    {/* Toolbar */}
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex-1 min-w-0">
        <FilterBar
          searchPlaceholder="Buscar por título…"
          filters={[{ key: "status", label: "Todos los estados", options: STATUS_FILTER_OPTIONS }]}
          values={filters}
          onFilterChange={handleFilterChange}
        />
      </div>
      <button
        onClick={openCreate}
        className="flex items-center gap-1.5 bg-foreground text-white rounded-full px-4 py-2 text-sm font-bold hover:bg-foreground/90 transition-colors shrink-0"
      >
        <Plus className="size-4" />Crear evento
      </button>
    </div>

    {filtered.length === 0 ? (
      <EmptyState message="No se encontraron eventos" />
    ) : (
      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage="No se encontraron eventos"
        onRowClick={(event) => toggleExpand(event.id)}
        expandedRowId={expandedId}
        renderExpandedRow={renderExpandedRow}
        gridTemplateColumns="32px 1fr 0.5fr 0.5fr 0.6fr 0.4fr 40px"
      />
    )}

    {/* Modals */}
    {modal && (
      <EventFormModal
        mode={modal.type}
        initial={modal.type === "edit" ? eventToForm(modal.event) : EMPTY_EVENT_FORM}
        clubs={clubs}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        error={mutations.modalError}
        loading={mutations.modalLoading}
      />
    )}

    {mutations.cancelTarget && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="rounded-2xl bg-card border border-border p-6 w-full max-w-sm shadow-xl">
          <p className="text-sm font-bold text-foreground leading-snug">
            {`¿Cancelar el evento "${mutations.cancelTarget.title}"? Esta acción no se puede deshacer.`}
          </p>
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => mutations.setCancelTarget(null)}
              disabled={mutations.cancelLoading}
              className="flex-1 border border-border rounded-full py-2 text-sm font-bold text-zinc-600 hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => void mutations.confirmCancel()}
              disabled={mutations.cancelLoading}
              className="flex-1 bg-red-600 text-white rounded-full py-2 text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {mutations.cancelLoading ? "Procesando…" : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
)
```

- [ ] **Step 8: Verificar TypeScript**

```bash
cd /home/reu/Escritorio/MATCHPOINT && npx tsc --noEmit 2>&1 | grep AdminEventsView
```
Expected: sin output.

- [ ] **Step 9: Commit**

```bash
git add src/features/activities/components/AdminEventsView.tsx
git commit -m "feat(admin): AdminEventsView — inline expand + shared FilterBar + DataTable"
```

---

## Task 7: AdminTournamentsView — inline expand (custom table)

AdminTournamentsView usa su propia tabla con CSS grid (no DataTable). Agregaremos el patrón de inline expand directamente en esa tabla.

**Files:**
- Modify: `src/components/admin/AdminTournamentsView.tsx`

- [ ] **Step 1: Agregar imports**

Al inicio del archivo, añadir a los imports existentes:

```tsx
import { ChevronRight } from "lucide-react"
import { AdminDotsMenu } from "@/components/admin/shared/AdminDotsMenu"
import { AdminInlinePanel } from "@/components/admin/shared/AdminInlinePanel"
```

- [ ] **Step 2: Agregar estado `expandedId` dentro de `AdminTournamentsView`**

Después de las líneas de estado existentes (`const [modal, ...] = useState...`):

```tsx
const [expandedId, setExpandedId] = useState<string | null>(null)

function toggleExpand(tournamentId: string) {
  setExpandedId((prev) => (prev === tournamentId ? null : tournamentId))
}
```

- [ ] **Step 3: Agregar función `renderExpandedRow` antes del return**

```tsx
function renderTournamentExpanded(t: TournamentAdmin) {
  const isTerminal = TERMINAL_STATUSES.has(t.status)

  const chips: string[] = []
  if (t.club_name) chips.push(t.club_name)
  chips.push(`${t.participant_count}/${t.max_participants} participantes`)
  if (t.entry_fee > 0) chips.push(`$${t.entry_fee.toFixed(2)} inscripción`)
  if (t.modality) chips.push(t.modality)

  const avatar = (
    <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
      <Trophy className="size-5 text-amber-600" />
    </div>
  )

  return (
    <AdminInlinePanel
      avatar={avatar}
      name={t.name}
      subtitle={t.club_name ?? "Sin club"}
      chips={chips}
      badge={<StatusBadge status={t.status} />}
      actions={
        <>
          {!isTerminal && (
            <button
              onClick={() => openEdit(t)}
              className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-border text-zinc-600 hover:bg-secondary transition-colors"
            >
              Editar
            </button>
          )}
          <button
            className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-border text-zinc-600 hover:bg-secondary transition-colors"
          >
            Ver bracket
          </button>
          {!isTerminal && (
            <button
              onClick={() => requestCancel(t)}
              className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              Cancelar torneo
            </button>
          )}
        </>
      }
    />
  )
}
```

- [ ] **Step 4: Actualizar el header de la tabla en el return**

Localizar la línea con el array de headers `["Nombre", "Deporte", "Club", "Estado", "Participantes", "Fecha inicio", ""]` y reemplazar con:

```tsx
<div className="grid grid-cols-[32px_2fr_1fr_1fr_1fr_1fr_1fr_40px] gap-3 px-5 py-3 border-b border-border bg-secondary">
  {["", "Nombre", "Deporte", "Club", "Estado", "Participantes", "Fecha inicio", ""].map((h, i) => (
    <p key={i} className="text-[10px] font-black uppercase tracking-wide text-zinc-400 last:text-right">
      {h}
    </p>
  ))}
</div>
```

- [ ] **Step 5: Actualizar las filas de la tabla en el return**

Reemplazar el bloque `{tournaments.map((t) => { ...return (<div key={t.id} className="grid ...">...</div>) })}` con:

```tsx
{tournaments.map((t) => {
  const isTerminal = TERMINAL_STATUSES.has(t.status)
  const isExpanded = expandedId === t.id
  return (
    <div key={t.id}>
      <div
        className={`grid grid-cols-[32px_2fr_1fr_1fr_1fr_1fr_1fr_40px] gap-3 px-5 py-3.5 items-center cursor-pointer transition-colors ${
          isExpanded ? "bg-[#f8faff]" : "hover:bg-zinc-50"
        }`}
        onClick={() => toggleExpand(t.id)}
      >
        {/* Expand chevron */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleExpand(t.id) }}
          className="flex items-center justify-center text-zinc-400 hover:text-zinc-700"
          aria-label={isExpanded ? "Colapsar" : "Expandir"}
        >
          <ChevronRight className={`size-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
        </button>

        {/* Name */}
        <div>
          <p className="text-sm font-bold text-foreground leading-tight">{t.name}</p>
          {t.entry_fee > 0 && (
            <p className="text-[10px] text-zinc-400 mt-0.5">Inscripción: ${t.entry_fee.toFixed(2)}</p>
          )}
        </div>

        <div><SportBadge sport={t.sport} /></div>
        <p className="text-xs text-zinc-600 truncate">{t.club_name ?? "—"}</p>
        <div><StatusBadge status={t.status} /></div>
        <p className="text-sm font-black text-foreground text-right">
          {t.participant_count}
          <span className="text-zinc-400 font-normal">/{t.max_participants}</span>
        </p>
        <p className="text-xs text-zinc-500 text-right">{formatDate(t.start_date)}</p>

        {/* Dots menu */}
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <AdminDotsMenu
            items={[
              { label: "Editar", disabled: isTerminal, onClick: () => openEdit(t) },
              { label: "Ver bracket", onClick: () => { /* TODO */ } },
              { label: "Cancelar", variant: "danger", disabled: isTerminal, onClick: () => requestCancel(t) },
            ]}
          />
        </div>
      </div>

      {/* Expanded panel */}
      {isExpanded && renderTournamentExpanded(t)}
    </div>
  )
})}
```

- [ ] **Step 6: Verificar TypeScript**

```bash
cd /home/reu/Escritorio/MATCHPOINT && npx tsc --noEmit 2>&1 | grep AdminTournamentsView
```
Expected: sin output.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/AdminTournamentsView.tsx
git commit -m "feat(admin): AdminTournamentsView — inline expand pattern"
```

---

## Task 8: AdminInvitesView — inline expand

**Files:**
- Modify: `src/components/admin/AdminInvitesView.tsx`

- [ ] **Step 1: Agregar imports**

```tsx
import { ChevronRight, Link2 } from "lucide-react"
import { AdminDotsMenu } from "@/components/admin/shared/AdminDotsMenu"
import { AdminInlinePanel } from "@/components/admin/shared/AdminInlinePanel"
```

- [ ] **Step 2: Agregar `expandedId` state dentro de `AdminInvitesView`**

```tsx
const [expandedId, setExpandedId] = useState<string | null>(null)

function toggleExpand(inviteId: string) {
  setExpandedId((prev) => (prev === inviteId ? null : inviteId))
}
```

- [ ] **Step 3: Agregar columna ▶ al inicio de `columns` y columna ⋯ al final**

Reemplazar el array `columns` completo:

```tsx
const columns: Column<InviteLinkAdmin>[] = [
  {
    key: "expand",
    header: "",
    render: (invite) => (
      <button
        onClick={(e) => { e.stopPropagation(); toggleExpand(invite.id) }}
        className="flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors"
        aria-label={expandedId === invite.id ? "Colapsar" : "Expandir"}
      >
        <ChevronRight className={`size-4 transition-transform duration-200 ${expandedId === invite.id ? "rotate-90" : ""}`} />
      </button>
    ),
    className: "w-6",
  },
  {
    key: "code",
    header: "Código",
    render: (invite) => (
      <span className="font-mono text-xs font-bold text-foreground bg-secondary px-2 py-0.5 rounded-lg tracking-wider">
        {invite.code}
      </span>
    ),
  },
  {
    key: "entity_type",
    header: "Tipo",
    render: (invite) => {
      const classes = ENTITY_TYPE_BADGE_CLASSES[invite.entity_type] ?? "bg-secondary text-zinc-500 border-border"
      const label = ENTITY_TYPE_LABELS[invite.entity_type] ?? invite.entity_type
      return (
        <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${classes}`}>
          {label}
        </span>
      )
    },
  },
  {
    key: "entity_id",
    header: "Entidad",
    render: (invite) => (
      <span className="font-mono text-xs text-zinc-500">
        {invite.entity_id === "global" ? "global" : `${invite.entity_id.slice(0, 8)}…`}
      </span>
    ),
  },
  {
    key: "creator_name",
    header: "Creado por",
    render: (invite) => (
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{invite.creator_name ?? "—"}</span>
        {invite.creator_email && <span className="text-[11px] text-zinc-400">{invite.creator_email}</span>}
      </div>
    ),
  },
  {
    key: "uses",
    header: "Usos",
    render: (invite) => (
      <span className="text-sm font-semibold">
        {invite.uses_count}
        <span className="text-zinc-400 font-normal">/{invite.max_uses !== null ? invite.max_uses : "∞"}</span>
      </span>
    ),
  },
  {
    key: "expires_at",
    header: "Expiración",
    render: (invite) => <span className="text-sm text-zinc-500">{formatExpiry(invite.expires_at)}</span>,
  },
  {
    key: "status",
    header: "Estado",
    render: (invite) => {
      const { label, variant } = getInviteStatus(invite)
      return <StatusBadge label={label} variant={variant} />
    },
  },
  {
    key: "dots",
    header: "",
    render: (invite) => (
      <AdminDotsMenu
        items={[
          {
            label: "Copiar enlace",
            onClick: async () => {
              const url = `${BASE_URL}/invite/${invite.code}`
              try { await navigator.clipboard.writeText(url) } catch { /* ignore */ }
            },
          },
          {
            label: "Revocar",
            variant: "danger",
            disabled: !canRevoke(invite),
            onClick: () => { setRevokeError(null); setPendingRevoke(invite) },
          },
        ]}
      />
    ),
    className: "flex justify-end",
  },
]
```

- [ ] **Step 4: Agregar `renderExpandedRow` antes del return**

```tsx
function renderExpandedRow(invite: InviteLinkAdmin) {
  const { label, variant } = getInviteStatus(invite)
  const inviteUrl = `${BASE_URL}/invite/${invite.code}`

  const chips: string[] = []
  chips.push(ENTITY_TYPE_LABELS[invite.entity_type] ?? invite.entity_type)
  chips.push(`${invite.uses_count} usos${invite.max_uses !== null ? ` / ${invite.max_uses} máx` : ""}`)
  if (invite.expires_at) chips.push(`Expira: ${formatExpiry(invite.expires_at)}`)

  const avatar = (
    <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center">
      <Link2 className="size-5 text-teal-600" />
    </div>
  )

  return (
    <AdminInlinePanel
      avatar={avatar}
      name={invite.code}
      subtitle={invite.creator_name ?? "Sin creador"}
      chips={chips}
      badge={<StatusBadge label={label} variant={variant} />}
      actions={
        <>
          <button
            onClick={async () => {
              try { await navigator.clipboard.writeText(inviteUrl) } catch { /* ignore */ }
            }}
            className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-border text-zinc-600 hover:bg-secondary transition-colors"
          >
            Copiar enlace
          </button>
          {canRevoke(invite) && (
            <button
              onClick={() => { setRevokeError(null); setPendingRevoke(invite) }}
              className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              Revocar
            </button>
          )}
        </>
      }
    />
  )
}
```

- [ ] **Step 5: Actualizar `<DataTable>` en el return**

```tsx
<DataTable
  columns={columns}
  data={filtered}
  emptyMessage="No se encontraron invite links"
  keyExtractor={(invite) => invite.id}
  onRowClick={(invite) => toggleExpand(invite.id)}
  expandedRowId={expandedId}
  renderExpandedRow={renderExpandedRow}
  gridTemplateColumns="32px 0.6fr 0.4fr 0.6fr 0.8fr 0.4fr 0.6fr 0.5fr 40px"
/>
```

- [ ] **Step 6: Verificar TypeScript**

```bash
cd /home/reu/Escritorio/MATCHPOINT && npx tsc --noEmit 2>&1 | grep AdminInvitesView
```
Expected: sin output.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/AdminInvitesView.tsx
git commit -m "feat(admin): AdminInvitesView — inline expand pattern"
```

---

## Task 9: AdminReservationsView — inline expand

**Files:**
- Modify: `src/components/admin/AdminReservationsView.tsx`

- [ ] **Step 1: Agregar imports**

```tsx
import { ChevronRight } from "lucide-react"
import { AdminDotsMenu } from "@/components/admin/shared/AdminDotsMenu"
import { AdminInlinePanel } from "@/components/admin/shared/AdminInlinePanel"
```

- [ ] **Step 2: Agregar `expandedId` state dentro de `AdminReservationsView`**

```tsx
const [expandedId, setExpandedId] = useState<string | null>(null)

function toggleExpand(reservationId: string) {
  setExpandedId((prev) => (prev === reservationId ? null : reservationId))
}
```

- [ ] **Step 3: Reemplazar el array `columns`**

```tsx
const columns: Column<ReservationAdmin>[] = [
  {
    key: "expand",
    header: "",
    render: (r) => (
      <button
        onClick={(e) => { e.stopPropagation(); toggleExpand(r.id) }}
        className="flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors"
        aria-label={expandedId === r.id ? "Colapsar" : "Expandir"}
      >
        <ChevronRight className={`size-4 transition-transform duration-200 ${expandedId === r.id ? "rotate-90" : ""}`} />
      </button>
    ),
    className: "w-6",
  },
  {
    key: "user",
    header: "Usuario",
    render: (r) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-bold text-foreground">{r.user_name ?? "—"}</span>
        {r.user_email && <span className="text-[11px] text-zinc-400">{r.user_email}</span>}
      </div>
    ),
  },
  {
    key: "club",
    header: "Club",
    render: (r) => <span className="text-sm text-zinc-600">{r.club_name ?? "—"}</span>,
  },
  {
    key: "court",
    header: "Cancha",
    render: (r) => (
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{r.court_name ?? "—"}</span>
        {r.court_sport && <span className="text-[11px] text-zinc-400">{SPORT_LABELS[r.court_sport] ?? r.court_sport}</span>}
      </div>
    ),
  },
  {
    key: "datetime",
    header: "Fecha y hora",
    render: (r) => (
      <span className="text-sm text-zinc-600">{formatDateTime(r.date, r.start_time, r.end_time)}</span>
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
    render: (r) => <span className="font-bold text-foreground">{formatPrice(r.total_price)}</span>,
  },
  {
    key: "dots",
    header: "",
    render: (r) => (
      <AdminDotsMenu
        items={[
          {
            label: "Ver detalle",
            onClick: () => toggleExpand(r.id),
          },
          {
            label: "Cancelar",
            variant: "danger",
            disabled: r.status === "cancelled",
            onClick: () => { setCancelError(null); setPendingCancel(r) },
          },
        ]}
      />
    ),
    className: "flex justify-end",
  },
]
```

- [ ] **Step 4: Agregar `renderExpandedRow` antes del return**

```tsx
function renderExpandedRow(r: ReservationAdmin) {
  const { label, variant } = STATUS_BADGE[r.status]

  const chips: string[] = []
  if (r.club_name) chips.push(r.club_name)
  if (r.court_sport) chips.push(SPORT_LABELS[r.court_sport] ?? r.court_sport)
  chips.push(formatDateTime(r.date, r.start_time, r.end_time))
  chips.push(formatPrice(r.total_price))

  const avatar = (
    <div className="w-11 h-11 rounded-xl bg-zinc-200 flex items-center justify-center">
      <CalendarCheck className="size-5 text-zinc-500" />
    </div>
  )

  return (
    <AdminInlinePanel
      avatar={avatar}
      name={r.user_name ?? "Usuario desconocido"}
      subtitle={r.user_email ?? "Sin email"}
      chips={chips}
      badge={<StatusBadge label={label} variant={variant} />}
      actions={
        <>
          {r.status !== "cancelled" && (
            <button
              onClick={() => { setCancelError(null); setPendingCancel(r) }}
              className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              Cancelar reserva
            </button>
          )}
        </>
      }
    />
  )
}
```

- [ ] **Step 5: Actualizar `<DataTable>` en el return**

```tsx
<DataTable
  columns={columns}
  data={filtered}
  emptyMessage="No se encontraron reservas"
  keyExtractor={(r) => r.id}
  onRowClick={(r) => toggleExpand(r.id)}
  expandedRowId={expandedId}
  renderExpandedRow={renderExpandedRow}
  gridTemplateColumns="32px 1fr 0.7fr 0.7fr 1fr 0.5fr 0.5fr 40px"
/>
```

- [ ] **Step 6: Verificar TypeScript**

```bash
cd /home/reu/Escritorio/MATCHPOINT && npx tsc --noEmit 2>&1 | grep AdminReservationsView
```
Expected: sin output.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/AdminReservationsView.tsx
git commit -m "feat(admin): AdminReservationsView — inline expand pattern"
```

---

## Task 10: Eliminar UserDetailPanel y sub-componentes

**Files:**
- Delete: `src/components/admin/user-detail/UserDetailPanel.tsx`
- Delete: `src/components/admin/user-detail/MembershipsSection.tsx`
- Delete: `src/components/admin/user-detail/VerificationSection.tsx`
- Delete: `src/components/admin/user-detail/BadgesSection.tsx`

`helpers.ts` y `OriginBadge.tsx` se mantienen (usados por AdminUsersView).

- [ ] **Step 1: Verificar que nada más importa UserDetailPanel**

```bash
grep -r "UserDetailPanel" /home/reu/Escritorio/MATCHPOINT/src --include="*.tsx" --include="*.ts"
```
Expected: sin output (ya lo eliminamos de AdminUsersView en Task 4).

- [ ] **Step 2: Verificar que nada más importa los sub-componentes**

```bash
grep -r "MembershipsSection\|VerificationSection\|BadgesSection" /home/reu/Escritorio/MATCHPOINT/src --include="*.tsx" --include="*.ts"
```
Expected: sin output.

- [ ] **Step 3: Eliminar los archivos**

```bash
rm /home/reu/Escritorio/MATCHPOINT/src/components/admin/user-detail/UserDetailPanel.tsx
rm /home/reu/Escritorio/MATCHPOINT/src/components/admin/user-detail/MembershipsSection.tsx
rm /home/reu/Escritorio/MATCHPOINT/src/components/admin/user-detail/VerificationSection.tsx
rm /home/reu/Escritorio/MATCHPOINT/src/components/admin/user-detail/BadgesSection.tsx
```

- [ ] **Step 4: Verificar TypeScript global**

```bash
cd /home/reu/Escritorio/MATCHPOINT && npx tsc --noEmit 2>&1
```
Expected: sin output (build limpio).

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "chore(admin): delete UserDetailPanel slide-over and sub-components"
```

---

## Task 11: Build final y verificación

- [ ] **Step 1: Build de producción**

```bash
cd /home/reu/Escritorio/MATCHPOINT && npm run build 2>&1 | tail -30
```
Expected: `✓ Compiled successfully` sin errores TypeScript.

- [ ] **Step 2: Verificar que los modales existentes no tienen regresiones**

```bash
grep -r "CreateUserModal\|ClubModal\|EventFormModal\|ConfirmDialog" /home/reu/Escritorio/MATCHPOINT/src/components/admin --include="*.tsx" | grep "import"
```
Expected: los modales siguen importados en sus respectivas views.

- [ ] **Step 3: Commit final**

```bash
git add .
git commit -m "feat(admin): complete inline-expand redesign — 6 tables, AdminDotsMenu, AdminInlinePanel"
```

---

## Notas de implementación

- `gridTemplateColumns` en cada DataTable está ajustado por view. Si el layout se ve mal, ajustar las proporciones (ej. `0.6fr` → `0.8fr`).
- AdminTournamentsView reutiliza `StatusBadge` local (no el de shared) — asegurarse de no mezclar.
- Las acciones "Ver membresía", "Ver bracket", "Ver inscritos" son placeholders marcados con `/* TODO */`. El spec no requiere implementarlas en esta fase.
- `SuspendTarget` y `DeleteTarget` ahora están definidos inline en AdminUsersView (ya no en UserDetailPanel).
