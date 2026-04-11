"use client"

import { useEffect, useRef, useState } from "react"
import type { ActivityFeedEntry } from "@/lib/admin/queries"
import { createClient } from "@/lib/supabase/client"
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js"
import { cn } from "@/lib/utils"

const ACTION_LABELS: Record<string, { label: string; dot: string }> = {
  club_created:            { label: "Club creado",          dot: "bg-emerald-500" },
  club_updated:            { label: "Club actualizado",     dot: "bg-sky-500" },
  club_deleted:            { label: "Club eliminado",       dot: "bg-red-500" },
  club_request_approved:   { label: "Solicitud aprobada",  dot: "bg-emerald-500" },
  club_request_rejected:   { label: "Solicitud rechazada", dot: "bg-red-500" },
  tournament_updated:      { label: "Torneo actualizado",  dot: "bg-amber-500" },
  tournament_deleted:      { label: "Torneo eliminado",    dot: "bg-red-500" },
  user_created:            { label: "Usuario creado",      dot: "bg-violet-500" },
  invite_revoked:          { label: "Invite revocado",     dot: "bg-zinc-400" },
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "ahora"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function FeedItem({ entry, isNew }: { entry: ActivityFeedEntry; isNew: boolean }) {
  const meta = ACTION_LABELS[entry.action] ?? { label: entry.action.replace(/_/g, " "), dot: "bg-zinc-400" }
  const entityName = (entry.details?.name as string) ?? (entry.details?.entity_name as string) ?? null

  return (
    <div className={cn(
      "flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all duration-500",
      isNew && "bg-emerald-50 border border-emerald-200"
    )}>
      <div className={cn("size-2 rounded-full mt-1.5 shrink-0", meta.dot)} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-zinc-800 leading-snug truncate">{meta.label}</p>
        {entityName && (
          <p className="text-[10px] text-zinc-400 truncate">{entityName}</p>
        )}
      </div>
      <span className="text-[10px] text-zinc-400 shrink-0 mt-0.5">
        {formatTimeAgo(entry.created_at)}
      </span>
    </div>
  )
}

interface Props {
  initialFeed: ActivityFeedEntry[]
}

export function ControlTowerActivityFeed({ initialFeed }: Props) {
  const [feed, setFeed] = useState<ActivityFeedEntry[]>(initialFeed)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [pulse, setPulse] = useState(false)
  const [realtimeActive, setRealtimeActive] = useState(false)
  const newIdsRef = useRef<Set<string>>(new Set())

  const flashNew = (ids: string[]) => {
    const next = new Set(ids)
    newIdsRef.current = next
    setNewIds(next)
    setPulse(true)
    setTimeout(() => {
      newIdsRef.current = new Set()
      setNewIds(new Set())
      setPulse(false)
    }, 3000)
  }

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("admin-audit-log-rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_log" },
        (payload: RealtimePostgresInsertPayload<Record<string, unknown>>) => {
          const newEntry = payload.new as unknown as ActivityFeedEntry
          setFeed((prev) => [newEntry, ...prev].slice(0, 10))
          flashNew([newEntry.id])
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") setRealtimeActive(true)
      })

    // Polling fallback (30s) for cases where realtime is not available
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/activity-feed")
        if (!res.ok) return
        const json = await res.json() as { success: boolean; data: ActivityFeedEntry[] | null }
        const entries = Array.isArray(json.data) ? json.data : []
        setFeed((prev) => {
          const existingIds = new Set(prev.map((e) => e.id))
          const incoming = entries.filter((e) => !existingIds.has(e.id))
          if (incoming.length === 0) return prev
          flashNew(incoming.map((e) => e.id))
          return entries.slice(0, 10)
        })
      } catch { /* silent */ }
    }, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="rounded-2xl bg-card flex flex-col overflow-hidden h-full border border-border">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Actividad</p>
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "size-1.5 rounded-full transition-colors",
            realtimeActive ? (pulse ? "bg-emerald-400 animate-pulse" : "bg-emerald-500") : "bg-zinc-300"
          )} />
          <span className={cn(
            "text-[10px] font-black uppercase tracking-wider",
            realtimeActive ? "text-emerald-600" : "text-zinc-400"
          )}>
            {realtimeActive ? "LIVE" : "SYNC"}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {feed.length === 0 ? (
          <div className="flex items-center justify-center h-full py-8">
            <p className="text-xs text-zinc-400">Sin actividad reciente</p>
          </div>
        ) : (
          feed.map((entry) => (
            <FeedItem key={entry.id} entry={entry} isNew={newIds.has(entry.id)} />
          ))
        )}
      </div>
    </div>
  )
}
