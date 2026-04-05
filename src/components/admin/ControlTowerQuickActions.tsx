"use client"

import Link from "next/link"
import { CalendarPlus, Building2, UserX, Bell, Star, Link2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActionBtn {
  href: string
  icon: React.ReactNode
  label: string
  description: string
  accent: string
  textAccent: string
}

const ACTIONS: ActionBtn[] = [
  {
    href: "/admin/events?action=create",
    icon: <CalendarPlus className="size-4" />,
    label: "Crear Evento",
    description: "Nuevo evento global",
    accent: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
    textAccent: "text-emerald-700",
  },
  {
    href: "/admin/clubs?action=add",
    icon: <Building2 className="size-4" />,
    label: "Añadir Club",
    description: "Registrar club nuevo",
    accent: "bg-sky-50 border-sky-200 hover:bg-sky-100",
    textAccent: "text-sky-700",
  },
  {
    href: "/admin/users?action=suspend",
    icon: <UserX className="size-4" />,
    label: "Suspender Usuario",
    description: "Bloquear acceso",
    accent: "bg-red-50 border-red-200 hover:bg-red-100",
    textAccent: "text-red-700",
  },
  {
    href: "/admin/settings?tab=announcements",
    icon: <Bell className="size-4" />,
    label: "Notificación Global",
    description: "Avisar a todos",
    accent: "bg-amber-50 border-amber-200 hover:bg-amber-100",
    textAccent: "text-amber-700",
  },
  {
    href: "/admin/events?action=feature",
    icon: <Star className="size-4" />,
    label: "Destacar Evento",
    description: "Promover en portada",
    accent: "bg-violet-50 border-violet-200 hover:bg-violet-100",
    textAccent: "text-violet-700",
  },
  {
    href: "/admin/invites?action=create",
    icon: <Link2 className="size-4" />,
    label: "Crear Invitación",
    description: "Generar invite link",
    accent: "bg-teal-50 border-teal-200 hover:bg-teal-100",
    textAccent: "text-teal-700",
  },
]

export function ControlTowerQuickActions() {
  return (
    <div className="rounded-2xl bg-white border border-zinc-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
          Acciones rápidas
        </p>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
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
              <span className={cn("text-[9px] text-center leading-tight opacity-70 hidden sm:block", action.textAccent)}>
                {action.description}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
