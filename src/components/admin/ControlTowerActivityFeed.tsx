"use client"

import { useEffect, useRef, useState } from "react"
import type { ActivityFeedEntry } from "@/lib/admin/queries"
import { cn } from "@/lib/utils"

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  club_created:            { label: "Club creado",           color: "bg-emerald-500" },
  club_updated:            { label: "Club actualizado",      color: "bg-sky-500" },
  club_deleted:            { label: "Club eliminado",        color: "bg-red-500" },
  club_request_approved:   { label: "Solicitud aprobada",   color: "bg-emerald-500" },
  club_request_rejected:   { label: "Solicitud rechazada",  color: "bg-red-500" },
  tournament_updated:      { label: "Torneo actualizado",   color: "bg-amber-500" },
  tournament_deleted:      { label: "Torneo eliminado",     color: "bg-red-500" },
  user_created:            { label: "Usuario creado",       color: "bg-violet-500" },
  invite_revoked:          { label: "Invite revocado",      color: "bg-zinc-500" },
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
  const meta = ACTION_LABELS[entry.action] ?? { label: entry.action.replace(/_/g, " "), color: "bg-zinc-600" }
  const entityName = (entry.details?.name as string) ?? (entry.details?.entity_name as string) ?? null

  return (
    <div className={cn(
      "flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all duration-500",
      isNew && "bg-emerald-500/5 border border-emerald-500/10"
    )}>
      <div className={cn("size-2 rounded-full mt-1.5 shrink-0", meta.color)} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-zinc-200 leading-snug truncate">{meta.label}</p>
        {entityName && (
          <p className="text-[10px] text-zinc-500 truncate">{entityName}</p>
        )}
      </div>
      <span className="text-[10px] text-zinc-600 shrink-0 mt-0.5">
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/activity-feed")
        if (!res.ok) return
        const data = await res.json() as ActivityFeedEntry[]
        const existingIds = new Set(feed.map((e) => e.id))
        const incoming = data.filter((e) => !existingIds.has(e.id))
        if (incoming.length > 0) {
          setFeed(data)
          setNewIds(new Set(incoming.map((e) => e.id)))
          setPulse(true)
          setTimeout(() => {
            setNewIds(new Set())
            setPulse(false)
          }, 3000)
        }
      } catch {
        // silent
      }
    }, 15000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [feed])

  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
          Actividad
        </p>
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "size-1.5 rounded-full transition-colors",
            pulse ? "bg-emerald-400" : "bg-emerald-500"
          )} />
          <span className={cn(
            "text-[10px] font-black uppercase tracking-wider transition-colors",
            pulse ? "text-emerald-400" : "text-emerald-500"
          )}>
            LIVE
          </span>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {feed.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-zinc-600">Sin actividad reciente</p>
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
