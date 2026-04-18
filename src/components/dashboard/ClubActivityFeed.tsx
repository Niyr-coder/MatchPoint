"use client"

import type { ActivityItem } from "@/features/clubs/club-activity"

interface ClubActivityFeedProps {
  items: ActivityItem[]
}

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `hace ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  return `hace ${Math.floor(hours / 24)}d`
}

export function ClubActivityFeed({ items }: ClubActivityFeedProps) {
  if (items.length === 0) return null

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-xs font-black uppercase tracking-tight text-zinc-400 mb-4">
        Actividad del Club
      </h2>
      <ul className="flex flex-col gap-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              className="mt-1.5 size-1.5 rounded-full shrink-0"
              style={{ background: item.color }}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-snug">
                {item.title}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {item.subtitle && (
                  <span>{item.subtitle}</span>
                )}
                {item.subtitle && <span> · </span>}
                <span>{relativeTime(item.timestamp)}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
