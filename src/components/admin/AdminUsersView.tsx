"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FilterBar } from "@/components/shared/FilterBar"
import { DataTable } from "@/components/shared/DataTable"
import { RoleBadge } from "@/components/shared/RoleBadge"
import { ROLE_LABELS } from "@/lib/roles"
import type { Column } from "@/components/shared/DataTable"
import type { UserAdmin } from "@/lib/admin/queries"
import type { AppRole } from "@/types"

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

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

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const filtered = users.filter((user) => {
    const name = user.full_name ?? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
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
      const json = await res.json()
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

  const columns: Column<UserAdmin>[] = [
    {
      key: "full_name",
      header: "Nombre",
      render: (user) => {
        const name =
          user.full_name ||
          [user.first_name, user.last_name].filter(Boolean).join(" ") ||
          "—"
        const initials = name
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0] ?? "")
          .join("")
          .toUpperCase()
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
                <span className="text-[10px] font-semibold text-zinc-600">{initials}</span>
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[#0a0a0a] truncate">{name}</span>
              {user.username && (
                <span className="text-[11px] text-zinc-400 truncate">@{user.username}</span>
              )}
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
            {user.rating != null ? `★ ${user.rating.toFixed(1)}` : "—"}
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
      />

      {roleError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {roleError}
        </div>
      )}
    </div>
  )
}
