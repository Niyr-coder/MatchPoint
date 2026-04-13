"use client"

import { X, ShieldOff, ShieldCheck } from "lucide-react"
import { RoleBadge } from "@/components/shared/RoleBadge"
import { MembershipsSection } from "@/components/admin/user-detail/MembershipsSection"
import { VerificationSection } from "@/components/admin/user-detail/VerificationSection"
import { displayName, isSuspended, initials, formatDate } from "@/components/admin/user-detail/helpers"
import type { UserAdmin, ClubAdmin } from "@/lib/admin/queries"
import type { AppRole } from "@/types"

export interface SuspendTarget {
  userId: string
  action: "suspend" | "unsuspend"
  userName: string
}

export interface DeleteTarget {
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

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border">
      <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400 shrink-0">{label}</p>
      <div className="text-sm font-medium text-foreground text-right">{value}</div>
    </div>
  )
}

export function UserDetailPanel({
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
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} aria-hidden="true" />

      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-card border-l border-border z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400">Detalle de usuario</p>
          <button onClick={onClose} className="size-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
            <X className="size-4 text-zinc-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={name} className="size-14 rounded-full object-cover shrink-0" />
            ) : (
              <div className="size-14 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                <span className="text-base font-black text-zinc-600">{userInitials}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-base font-black text-foreground truncate">{name}</p>
              {user.username && <p className="text-sm text-zinc-400">@{user.username}</p>}
            </div>
          </div>

          {suspended && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
              <ShieldOff className="size-4 text-red-500 shrink-0" />
              <p className="text-sm font-bold text-red-600">Cuenta suspendida</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <FieldRow label="Rol global" value={<RoleBadge role={role} size="sm" />} />
            <FieldRow label="Ciudad" value={user.city ?? "—"} />
            <FieldRow label="Provincia" value={user.province ?? "—"} />
            <FieldRow label="Miembro desde" value={formatDate(user.created_at)} />
            {user.rating != null && <FieldRow label="Rating" value={`★ ${Number(user.rating).toFixed(1)}`} />}
            {user.matches_played != null && <FieldRow label="Partidos jugados" value={String(user.matches_played)} />}
          </div>

          <div className="border-t border-border" />
          <VerificationSection user={user} onVerified={onVerified} />
          <div className="border-t border-border" />
          <MembershipsSection userId={user.id} clubs={clubs} onMembershipChange={onMembershipChange} />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex flex-col gap-2">
          {suspended ? (
            <button
              onClick={() => onSuspendRequest({ userId: user.id, action: "unsuspend", userName: name })}
              className="w-full flex items-center justify-center gap-2 bg-foreground text-white rounded-full py-2.5 text-sm font-bold hover:bg-foreground/90 transition-colors"
            >
              <ShieldCheck className="size-4" />Reactivar cuenta
            </button>
          ) : (
            <button
              onClick={() => onSuspendRequest({ userId: user.id, action: "suspend", userName: name })}
              className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 rounded-full py-2.5 text-sm font-bold hover:bg-red-50 transition-colors"
            >
              <ShieldOff className="size-4" />Suspender cuenta
            </button>
          )}
          <button
            onClick={() => onDeleteRequest({ userId: user.id, userName: name })}
            className="w-full flex items-center justify-center gap-2 bg-red-600 text-white rounded-full py-2.5 text-sm font-bold hover:bg-red-700 transition-colors"
          >
            <X className="size-4" />Eliminar cuenta permanentemente
          </button>
        </div>
      </div>
    </>
  )
}
