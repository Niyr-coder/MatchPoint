import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

export function ContextSelectorCard({ entry }: { entry: UserRoleEntry }) {
  const href = `/club/${entry.clubId}/${entry.role}`
  const initials = entry.clubName.slice(0, 2).toUpperCase()

  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-5 rounded-xl border border-zinc-200 bg-white hover:border-[#0a0a0a] transition-all group"
    >
      <Avatar className="size-12 shrink-0">
        <AvatarImage src={entry.clubLogo ?? undefined} alt={entry.clubName} />
        <AvatarFallback className="bg-zinc-100 text-[#0a0a0a] font-black text-sm border border-zinc-200">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-black text-[#0a0a0a] truncate text-sm uppercase tracking-tight">
          {entry.clubName}
        </p>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-green-600 mt-0.5">
          {ROLE_LABELS[entry.role]}
        </p>
      </div>

      <span className="text-zinc-300 group-hover:text-[#0a0a0a] transition-colors text-lg">→</span>
    </Link>
  )
}
