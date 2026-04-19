import Link from "next/link"
import { CalendarPlus, Users, Trophy, UserPlus } from "lucide-react"

const ACTIONS = [
  { label: "Reservar cancha", href: "/dashboard/reservations/new", icon: CalendarPlus },
  { label: "Crear match", href: "/dashboard/matches/new", icon: Users },
  { label: "Inscribirse a torneo", href: "/dashboard/tournaments", icon: Trophy },
  { label: "Invitar amigo", href: "/dashboard/invite", icon: UserPlus },
]

export function QuickActionsPanel() {
  return (
    <div className="animate-fade-in-up rounded-2xl overflow-hidden bg-card border border-border p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3.5">
        Acciones rápidas
      </p>
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-start gap-2 p-3 border border-border rounded-[10px] bg-white hover:border-zinc-300 transition-colors"
            >
              <Icon className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold">{action.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
