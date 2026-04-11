import Link from "next/link"
import { CalendarPlus, Trophy, Compass, UserCircle, ChevronRight } from "lucide-react"

const ACTIONS = [
  {
    label: "Reservar cancha",
    description: "Encontrar y reservar una cancha disponible",
    href: "/dashboard/reservations/new",
    icon: CalendarPlus,
    color: "bg-orange-50 text-orange-500",
  },
  {
    label: "Ver ranking",
    description: "Consulta tu posición en el ranking global",
    href: "/dashboard/ranking",
    icon: Trophy,
    color: "bg-amber-50 text-amber-500",
  },
  {
    label: "Explorar clubs",
    description: "Descubre clubs y canchas disponibles",
    href: "/dashboard/courts",
    icon: Compass,
    color: "bg-sky-50 text-sky-500",
  },
  {
    label: "Mi perfil",
    description: "Edita tu perfil y ratings deportivos",
    href: "/dashboard/account",
    icon: UserCircle,
    color: "bg-violet-50 text-violet-500",
  },
]

export function QuickActionsPanel() {
  return (
    <div className="animate-fade-in-up rounded-2xl overflow-hidden flex flex-col bg-card border border-border">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-sm font-black uppercase tracking-tight text-foreground">
          Acciones rápidas
        </h2>
      </div>

      {/* Actions */}
      <div className="flex-1 divide-y divide-border">
        {ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-4 px-6 py-4 hover:bg-muted transition-colors group"
            >
              <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${action.color}`}>
                <Icon className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{action.label}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{action.description}</p>
              </div>
              <ChevronRight className="size-4 text-zinc-300 group-hover:text-zinc-500 transition-colors shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
