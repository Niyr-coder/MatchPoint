"use client"

import Link from "next/link"
import { CalendarPlus, Building2, UserX, Bell, Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActionBtn {
  href: string
  icon: React.ReactNode
  label: string
  accent: string
  textAccent: string
}

const ACTIONS: ActionBtn[] = [
  {
    href: "/admin/events?action=create",
    icon: <CalendarPlus className="size-4" />,
    label: "Crear Evento",
    accent: "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20",
    textAccent: "text-emerald-400",
  },
  {
    href: "/admin/clubs?action=add",
    icon: <Building2 className="size-4" />,
    label: "Añadir Club",
    accent: "bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/20",
    textAccent: "text-sky-400",
  },
  {
    href: "/admin/users?action=suspend",
    icon: <UserX className="size-4" />,
    label: "Suspender Usuario",
    accent: "bg-red-500/10 border-red-500/20 hover:bg-red-500/20",
    textAccent: "text-red-400",
  },
  {
    href: "/admin/settings?tab=announcements",
    icon: <Bell className="size-4" />,
    label: "Notificación Global",
    accent: "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20",
    textAccent: "text-amber-400",
  },
  {
    href: "/admin/events?action=feature",
    icon: <Star className="size-4" />,
    label: "Destacar Evento",
    accent: "bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20",
    textAccent: "text-violet-400",
  },
]

export function ControlTowerQuickActions() {
  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
          Acciones rápidas
        </p>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-150 group",
                action.accent
              )}
            >
              <span className={cn("transition-transform group-hover:scale-110", action.textAccent)}>
                {action.icon}
              </span>
              <span className={cn("text-[10px] font-black text-center leading-tight uppercase tracking-wide", action.textAccent)}>
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
