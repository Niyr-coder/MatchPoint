"use client"

import { useState } from "react"
import { Users, UserPlus, ChevronDown } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { RoleBadge } from "@/components/shared/RoleBadge"
import { ROLE_LABELS } from "@/features/memberships/constants"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import type { ClubTeamMember as TeamMember } from "@/features/clubs/types"
import type { AppRole } from "@/types"

const VALID_ROLES = ["manager", "employee", "coach"] as const
type ValidRole = (typeof VALID_ROLES)[number]

function getInitials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

interface TeamManagerProps {
  clubId: string
  initialMembers: TeamMember[]
}

export function TeamManager({ clubId, initialMembers }: TeamManagerProps) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [newUserId, setNewUserId] = useState("")
  const [newRole, setNewRole] = useState<ValidRole>("employee")

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDeactivate, setPendingDeactivate] = useState<string | null>(null)
  const [deactivateLoading, setDeactivateLoading] = useState(false)

  async function handleAddMember() {
    if (!newUserId.trim()) {
      setAddError("El ID de usuario es requerido")
      return
    }
    setAddLoading(true)
    setAddError(null)
    try {
      const res = await fetch(`/api/club/${clubId}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: newUserId.trim(), role: newRole }),
      })
      const json = await res.json()
      if (!json.success) {
        setAddError(
          json.error === "user_not_found"
            ? "Usuario no encontrado"
            : json.error ?? "Error al agregar miembro"
        )
        return
      }
      const refreshed = await fetch(`/api/club/${clubId}/team`)
      const refreshedJson = await refreshed.json()
      if (refreshedJson.success) setMembers(refreshedJson.data)
      setNewUserId("")
      setNewRole("employee")
      setSheetOpen(false)
    } catch {
      setAddError("Error de red. Intenta de nuevo.")
    } finally {
      setAddLoading(false)
    }
  }

  async function handleRoleChange(memberId: string, role: string) {
    try {
      const res = await fetch(`/api/club/${clubId}/team`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "role", memberId, role }),
      })
      if (!res.ok) return
      const refreshed = await fetch(`/api/club/${clubId}/team`)
      const refreshedJson = await refreshed.json()
      if (refreshedJson.success) setMembers(refreshedJson.data)
    } catch {
      // silent — UI stays as-is
    }
  }

  async function handleDeactivate() {
    if (!pendingDeactivate) return
    setDeactivateLoading(true)
    try {
      const res = await fetch(`/api/club/${clubId}/team`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate", memberId: pendingDeactivate }),
      })
      if (!res.ok) return
      const refreshed = await fetch(`/api/club/${clubId}/team`)
      const refreshedJson = await refreshed.json()
      if (refreshedJson.success) setMembers(refreshedJson.data)
    } finally {
      setDeactivateLoading(false)
      setPendingDeactivate(null)
    }
  }

  return (
    <>
      {/* Add member trigger */}
      <div className="flex justify-end">
        <button
          onClick={() => setSheetOpen(true)}
          className="bg-[#0a0a0a] text-white rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] flex items-center gap-2 hover:bg-zinc-800 transition-colors"
        >
          <UserPlus className="size-3.5" />
          Agregar Miembro
        </button>
      </div>

      {/* Member list */}
      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-[#e5e5e5] rounded-2xl">
          <Users className="size-10 text-zinc-300" />
          <p className="text-sm font-bold text-zinc-400">Sin miembros en el equipo</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-[#e5e5e5] overflow-hidden divide-y divide-[#f0f0f0]">
          {members.map((member, i) => (
            <div
              key={member.id}
              className="animate-fade-in-up flex items-center gap-4 px-5 py-4"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              {/* Avatar */}
              <div className="size-10 rounded-full bg-zinc-100 text-zinc-500 font-black flex items-center justify-center text-sm shrink-0">
                {getInitials(member.fullName)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[#0a0a0a] truncate">
                  {member.fullName ?? "Sin nombre"}
                </p>
                <p className="text-[11px] text-zinc-400">
                  {member.phone ?? "Sin teléfono"} · Desde {formatDate(member.joinedAt)}
                </p>
              </div>

              {/* Role badge */}
              <RoleBadge role={(member.role as AppRole) ?? "user"} size="sm" />

              {/* Role select */}
              {member.role !== "owner" && (
                <div className="relative shrink-0">
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    className="appearance-none border border-[#e5e5e5] rounded-xl pl-3 pr-7 py-1.5 text-[11px] font-bold text-[#0a0a0a] outline-none focus:border-[#0a0a0a] bg-white cursor-pointer"
                  >
                    {VALID_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="size-3 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}

              {/* Deactivate */}
              {member.role !== "owner" && (
                <button
                  onClick={() => {
                    setPendingDeactivate(member.id)
                    setConfirmOpen(true)
                  }}
                  className="text-[10px] font-black uppercase tracking-wide text-red-500 hover:text-red-700 transition-colors shrink-0"
                >
                  Desactivar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add member sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full max-w-sm">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-base font-black uppercase tracking-tight text-[#0a0a0a]">
              Agregar Miembro
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                ID de Usuario
              </label>
              <input
                type="text"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                placeholder="uuid del usuario"
                className="border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                Rol
              </label>
              <div className="relative">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as ValidRole)}
                  className="w-full appearance-none border border-[#e5e5e5] rounded-xl px-4 pr-9 py-3 text-sm font-bold text-[#0a0a0a] outline-none focus:border-[#0a0a0a] bg-white cursor-pointer"
                >
                  {VALID_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="size-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {addError && (
              <p className="text-xs text-red-500 font-bold">{addError}</p>
            )}

            <button
              onClick={handleAddMember}
              disabled={addLoading}
              className="bg-[#0a0a0a] hover:bg-[#222222] text-white rounded-full px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] disabled:opacity-50 transition-colors mt-2"
            >
              {addLoading ? "Agregando..." : "Agregar al Equipo"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Deactivate confirm */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Desactivar Miembro"
        description="Esta acción quitará el acceso del miembro al club. Podrás reactivarlo más adelante."
        confirmLabel="Desactivar"
        variant="danger"
        loading={deactivateLoading}
        onConfirm={handleDeactivate}
      />
    </>
  )
}
