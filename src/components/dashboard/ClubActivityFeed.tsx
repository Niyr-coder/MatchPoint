"use client"

import Link from "next/link"
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

function PanelHeader({ title, cta, ctaHref }: { title: string; cta: string; ctaHref: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
      <h2 className="text-sm font-black uppercase tracking-[-0.02em]" style={{ fontFamily: "var(--font-heading)" }}>
        {title}
      </h2>
      <Link href={ctaHref} className="text-[11px] font-black uppercase tracking-[0.1em] text-primary hover:underline">
        {cta} →
      </Link>
    </div>
  )
}

export function ClubActivityFeed({ items }: ClubActivityFeedProps) {
  if (items.length === 0) return null

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <PanelHeader title="Actividad del club" cta="Ver todo" ctaHref="/dashboard/activity" />
      <div>
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-5 py-3.5"
            style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
          >
            {/* Avatar placeholder */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-emerald-700 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-[13px]">
              <b>{item.title}</b>{" "}
              <span className="text-muted-foreground">{item.subtitle}</span>
            </div>
            <div className="text-[11px] text-muted-foreground shrink-0">
              {relativeTime(item.timestamp)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
