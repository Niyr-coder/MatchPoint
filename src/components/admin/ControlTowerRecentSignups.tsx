"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { UserCheck, UserX, ShieldCheck, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RecentSignup } from "@/lib/admin/queries"

const ORIGIN_LABELS: Record<string, { label: string; color: string }> = {
  google:        { label: "Google",   color: "text-sky-600 bg-sky-50" },
  email:         { label: "Email",    color: "text-zinc-500 bg-zinc-100" },
  admin_created: { label: "Admin",    color: "text-violet-600 bg-violet-50" },
  invite:        { label: "Invitado", color: "text-emerald-600 bg-emerald-50" },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function initials(name: string | null, username: string | null): string {
  if (name) {
    const parts = name.trim().split(" ")
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase()
  }
  return (username?.[0] ?? "?").toUpperCase()
}

interface UserRowProps {
  user: RecentSignup
}

function UserRow({ user }: UserRowProps) {
  const [state, setState] = useState<"idle" | "done" | "error">("idle")
  const [action, setAction] = useState<"verify" | "suspend" | null>(null)
  const [isPending, startTransition] = useTransition()
  const origin = ORIGIN_LABELS[user.account_origin ?? "email"] ?? ORIGIN_LABELS.email

  const act = (a: "verify" | "suspend") => {
    setAction(a)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: a }),
        })
        const json = await res.json() as { success: boolean }
        setState(json.success ? "done" : "error")
      } catch {
        setState("error")
      }
    })
  }

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 transition-all",
      isPending && "opacity-50"
    )}>
      {/* Avatar */}
      <div className="size-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar_url} alt="" className="size-8 rounded-full object-cover" />
        ) : (
          <span className="text-[10px] font-black text-zinc-500">
            {initials(user.full_name, user.username)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold text-zinc-800 truncate">
            {user.full_name ?? user.username ?? "Usuario"}
          </p>
          {user.is_verified && (
            <ShieldCheck className="size-3 text-emerald-500 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn("text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full", origin.color)}>
            {origin.label}
          </span>
          <span className="text-[10px] text-zinc-400">{timeAgo(user.created_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {state === "done" ? (
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wide">
            {action === "verify" ? "Verificado" : "Suspendido"}
          </span>
        ) : state === "error" ? (
          <span className="text-[10px] font-black text-red-500">Error</span>
        ) : (
          <>
            {!user.is_verified && (
              <button
                onClick={() => act("verify")}
                disabled={isPending}
                title="Verificar usuario"
                className="size-6 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
              >
                <UserCheck className="size-3" />
              </button>
            )}
            <button
              onClick={() => act("suspend")}
              disabled={isPending}
              title="Suspender usuario"
              className="size-6 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
            >
              <UserX className="size-3" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

interface Props {
  users: RecentSignup[]
}

export function ControlTowerRecentSignups({ users }: Props) {
  return (
    <div className="rounded-2xl bg-card border border-border flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
          Nuevos registros
        </p>
        <Link
          href="/admin/users"
          className="text-[9px] font-black uppercase tracking-wider text-zinc-400 hover:text-zinc-600 flex items-center gap-0.5 transition-colors"
        >
          Ver todos <ChevronRight className="size-2.5" />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {users.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-zinc-400">Sin registros recientes</p>
          </div>
        ) : (
          users.map((u) => <UserRow key={u.id} user={u} />)
        )}
      </div>
    </div>
  )
}
