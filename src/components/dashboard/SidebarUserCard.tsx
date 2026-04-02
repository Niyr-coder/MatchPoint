import { LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RoleBadge } from "@/components/shared/RoleBadge"
import type { Profile, AppRole } from "@/types"

interface SidebarUserCardProps {
  profile: Profile
  currentRole: AppRole
}

export function SidebarUserCard({ profile, currentRole }: SidebarUserCardProps) {
  const initials = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join("")

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(" ")
    || profile.full_name
    || "Usuario"

  return (
    <div className="border-t border-zinc-800 p-3 space-y-2">
      <div className="flex items-center gap-3">
        <Avatar className="size-8 shrink-0">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
          <AvatarFallback className="bg-green-900 text-green-100 text-xs font-bold">
            {initials || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{displayName}</p>
          <RoleBadge role={currentRole} size="sm" className="mt-0.5" />
        </div>
      </div>
      <form action="/auth/signout" method="POST">
        <button
          type="submit"
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-semibold text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut className="size-3.5" />
          Cerrar sesión
        </button>
      </form>
    </div>
  )
}
