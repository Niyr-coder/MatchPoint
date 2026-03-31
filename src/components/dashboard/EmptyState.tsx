"use client"

import {
  Calendar, Search, Trophy, type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ICON_MAP: Record<string, LucideIcon> = { Calendar, Search, Trophy }

interface EmptyStateProps {
  /** Icon name string, e.g. "Calendar", "Search", "Trophy" */
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
  ghostLabel?: string
  className?: string
}

export function EmptyState({ icon, title, description, action, ghostLabel, className }: EmptyStateProps) {
  const Icon = icon ? (ICON_MAP[icon] ?? null) : null

  return (
    <div
      className={cn(
        "animate-fade-in-up-16 relative flex flex-col items-center justify-center py-16 px-6 text-center",
        "rounded-2xl border border-zinc-200 bg-white overflow-hidden",
        className
      )}
    >
      {ghostLabel && (
        <span className="absolute top-3 left-4 text-5xl font-black text-zinc-100 select-none pointer-events-none leading-none">
          {ghostLabel}
        </span>
      )}
      {Icon && (
        <div className="size-11 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-5">
          <Icon className="size-5 text-zinc-400" />
        </div>
      )}
      <p className="text-base font-black uppercase tracking-tight text-[#0a0a0a]">{title}</p>
      {description && (
        <p className="mt-2 text-xs font-medium text-zinc-400 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
