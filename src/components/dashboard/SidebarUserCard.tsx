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
    <div
      className="border-t border-slate-100 p-3 space-y-2"
      style={{
        background: "linear-gradient(to bottom, #ffffff, #f8faf8)",
      }}
    >
      <div className="flex items-center gap-3">
        <Avatar className="size-8 shrink-0 ring-2 ring-green-400 ring-offset-1">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
          <AvatarFallback className="bg-green-100 text-green-700 text-xs font-bold">
            {initials || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1e293b] truncate">{displayName}</p>
          <RoleBadge role={currentRole} size="sm" className="mt-0.5" />
        </div>
      </div>
      <form action="/auth/signout" method="POST">
        <button
          type="submit"
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-500 border border-slate-200 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
        >
          <LogOut className="size-3.5" />
          Cerrar sesión
        </button>
      </form>
    </div>
  )
}
