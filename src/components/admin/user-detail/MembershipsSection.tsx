"use client"

import { useState, useEffect, useCallback } from "react"
import { Building2, Trash2, UserPlus } from "lucide-react"
import { RoleBadge } from "@/components/shared/RoleBadge"
import type { ClubAdmin } from "@/lib/admin/queries"
import type { AppRole, ApiResponse } from "@/types"

const CLUB_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "owner",    label: "Owner" },
  { value: "manager",  label: "Manager" },
  { value: "partner",  label: "Partner" },
  { value: "coach",    label: "Coach" },
  { value: "employee", label: "Empleado" },
]

interface ClubMembership {
  club_id: string
  club_name: string | null
  role: string
  is_active: boolean
  joined_at: string
}

interface MembershipsSectionProps {
  userId: string
  clubs: ClubAdmin[]
  onMembershipChange: () => void
}

export function MembershipsSection({ userId, clubs, onMembershipChange }: MembershipsSectionProps) {
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
    if (!addClubId) { setAddError("Selecciona un club"); return }
    setAddLoading(true)
    setAddError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: addClubId, role: addRole }),
      })
      const json = (await res.json()) as ApiResponse<null>
      if (!json.success) { setAddError(json.error ?? "Error al agregar membresía"); return }
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
      if (!json.success) { setRemoveError(json.error ?? "Error al eliminar membresía"); return }
      await fetchMemberships()
      onMembershipChange()
    } catch {
      setRemoveError("Error de conexión. Intenta de nuevo.")
    } finally {
      setRemovingClubId(null)
    }
  }

  const assignedClubIds = new Set(memberships.map((m) => m.club_id))
  const availableClubs = clubs.filter((c) => !assignedClubIds.has(c.id))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Building2 className="size-3.5 text-zinc-400 shrink-0" />
        <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400">Membresías de Club</p>
      </div>

      {loadingFetch ? (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => <div key={i} className="h-9 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : fetchError ? (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-100">{fetchError}</p>
      ) : memberships.length === 0 ? (
        <p className="text-sm text-zinc-400 italic">Sin membresías activas</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {memberships.map((m) => (
            <div key={m.club_id} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">{m.club_name ?? m.club_id}</span>
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

      {removeError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-100">{removeError}</p>}

      {availableClubs.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex gap-2">
            <select
              value={addClubId}
              onChange={(e) => { setAddClubId(e.target.value); setAddError(null) }}
              className="flex-1 min-w-0 border border-border rounded-xl px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-foreground bg-card appearance-none cursor-pointer"
            >
              <option value="">Seleccionar club…</option>
              {availableClubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
            </select>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value)}
              className="border border-border rounded-xl px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-foreground bg-card appearance-none cursor-pointer"
            >
              {CLUB_ROLE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          {addError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-100">{addError}</p>}
          <button
            onClick={() => void handleAdd()}
            disabled={addLoading || !addClubId}
            className="flex items-center justify-center gap-1.5 w-full border border-border rounded-full py-2 text-[11px] font-bold text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {addLoading ? "Agregando…" : <><UserPlus className="size-3.5" />Agregar membresía</>}
          </button>
        </div>
      )}

      {availableClubs.length === 0 && !loadingFetch && memberships.length > 0 && (
        <p className="text-[11px] text-zinc-400 italic">Usuario asignado a todos los clubes disponibles</p>
      )}
    </div>
  )
}
