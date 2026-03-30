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
    <div className="flex items-center gap-3 px-3 py-3 border-t border-zinc-800">
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
  )
}
