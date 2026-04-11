"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Building2, CheckCircle, XCircle, Clock, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PendingClubRequest } from "@/lib/admin/queries"

const SPORT_LABELS: Record<string, string> = {
  padel: "Pádel",
  tennis: "Tenis",
  futbol: "Fútbol",
  pickleball: "Pickleball",
}

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

interface RequestCardProps {
  req: PendingClubRequest
  onDone: (id: string) => void
}

function RequestCard({ req, onDone }: RequestCardProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const days = daysAgo(req.created_at)

  const act = (action: "approve" | "reject") => {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/club-requests/${req.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        })
        const json = await res.json() as { success: boolean; error?: string }
        if (!json.success) { setError(json.error ?? "Error"); return }
        onDone(req.id)
      } catch {
        setError("Error de red")
      }
    })
  }

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-3 flex flex-col gap-2 transition-all",
      isPending && "opacity-50 pointer-events-none"
    )}>
      <div className="flex items-start gap-2">
        <div className="size-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
          <Building2 className="size-3.5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-zinc-800 truncate">{req.name}</p>
          <p className="text-[10px] text-zinc-400 truncate">{req.city}</p>
        </div>
        <div className={cn(
          "flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0",
          days >= 3 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
        )}>
          <Clock className="size-2.5" />
          {days}d
        </div>
      </div>

      {req.sports.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {req.sports.map((s) => (
            <span key={s} className="text-[9px] font-black uppercase tracking-wide bg-secondary px-1.5 py-0.5 rounded-md text-zinc-500">
              {SPORT_LABELS[s] ?? s}
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-[10px] text-red-500">{error}</p>}

      <div className="flex gap-1.5">
        <button
          onClick={() => act("approve")}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wide bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg py-1.5 transition-colors"
        >
          <CheckCircle className="size-3" />
          Aprobar
        </button>
        <button
          onClick={() => act("reject")}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wide bg-red-50 hover:bg-red-100 text-red-700 rounded-lg py-1.5 transition-colors"
        >
          <XCircle className="size-3" />
          Rechazar
        </button>
      </div>
    </div>
  )
}

interface Props {
  requests: PendingClubRequest[]
}

export function ControlTowerPendingRequests({ requests }: Props) {
  const [items, setItems] = useState<PendingClubRequest[]>(requests)

  const remove = (id: string) => setItems((prev) => prev.filter((r) => r.id !== id))

  return (
    <div className="rounded-2xl bg-card border border-border flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className={cn(
            "size-2 rounded-full shrink-0",
            items.length > 0 ? "bg-amber-500" : "bg-emerald-500"
          )} />
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
            Solicitudes pendientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <span className="text-[10px] font-black text-amber-600">
              {items.length}
            </span>
          )}
          <Link
            href="/admin/club-requests"
            className="text-[9px] font-black uppercase tracking-wider text-zinc-400 hover:text-zinc-600 flex items-center gap-0.5 transition-colors"
          >
            Ver todas <ChevronRight className="size-2.5" />
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <CheckCircle className="size-5 text-emerald-500" />
            <p className="text-xs font-black text-emerald-600 uppercase tracking-wide">Sin pendientes</p>
            <p className="text-[10px] text-zinc-400 text-center">
              No hay solicitudes de club esperando revisión.
            </p>
          </div>
        ) : (
          items.map((req) => (
            <RequestCard key={req.id} req={req} onDone={remove} />
          ))
        )}
      </div>
    </div>
  )
}
