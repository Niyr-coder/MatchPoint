import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { UserRoleEntry, AppRole } from "@/types"

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  owner: "Dueño",
  partner: "Socio",
  manager: "Gerente",
  employee: "Empleado",
  coach: "Entrenador",
  user: "Jugador",
}

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-red-900/50 text-red-400 border-red-800",
  owner: "bg-yellow-900/50 text-yellow-400 border-yellow-800",
  partner: "bg-blue-900/50 text-blue-400 border-blue-800",
  manager: "bg-purple-900/50 text-purple-400 border-purple-800",
  employee: "bg-orange-900/50 text-orange-400 border-orange-800",
  coach: "bg-cyan-900/50 text-cyan-400 border-cyan-800",
  user: "bg-green-900/50 text-green-400 border-green-800",
}

export function ContextSelectorCard({ entry }: { entry: UserRoleEntry }) {
  const href = `/club/${entry.clubId}/${entry.role}`
  const initials = entry.clubName.slice(0, 2).toUpperCase()

  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-5 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-green-600/50 hover:bg-zinc-800/80 transition-all group"
    >
      <Avatar className="size-12 shrink-0">
        <AvatarImage src={entry.clubLogo ?? undefined} alt={entry.clubName} />
        <AvatarFallback className="bg-zinc-700 text-white font-bold text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate group-hover:text-green-400 transition-colors">
          {entry.clubName}
        </p>
        <Badge
          className={`mt-1.5 text-[10px] h-4 border ${ROLE_COLORS[entry.role]}`}
        >
          {ROLE_LABELS[entry.role]}
        </Badge>
      </div>

      <span className="text-zinc-600 group-hover:text-green-500 transition-colors text-lg">→</span>
    </Link>
  )
}
