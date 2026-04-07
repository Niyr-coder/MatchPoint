import { authorizeOrRedirect } from "@/features/auth/queries"
import { getUserRoles } from "@/features/memberships/queries"
import { getPlayerStats } from "@/features/users/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { StatCard } from "@/components/shared/StatCard"
import { RoleBadge } from "@/components/shared/RoleBadge"
import { ProfileEditForm } from "@/features/users/components/ProfileEditForm"
import { Calendar, Trophy, Target, Star } from "lucide-react"
import type { Profile, AppRole } from "@/types"

function getInitials(profile: Profile): string {
  const first = profile.first_name?.charAt(0) ?? ""
  const last = profile.last_name?.charAt(0) ?? ""
  if (first || last) return `${first}${last}`.toUpperCase()
  return "?"
}

function formatJoinDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    month: "long",
    year: "numeric",
  })
}

export default async function ProfilePage() {
  const ctx = await authorizeOrRedirect()

  const supabase = await createServiceClient()
  const [{ data: profileData }, stats, clubRoles] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", ctx.userId).single(),
    getPlayerStats(ctx.userId),
    getUserRoles(ctx.userId),
  ])

  const profile = profileData as Profile & { username?: string }

  const displayName =
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "Jugador"

  const globalRole = ctx.globalRole as AppRole

  return (
    <div className="flex flex-col gap-8">
      {/* Profile hero */}
      <div className="flex flex-col items-center gap-4 py-8 border-b border-[#e5e5e5]">
        {/* Avatar */}
        <div className="size-20 rounded-full bg-[#1a56db] flex items-center justify-center shrink-0">
          <span className="text-2xl font-black text-white">
            {getInitials(profile)}
          </span>
        </div>

        {/* Name & username */}
        <div className="text-center">
          <h1 className="text-2xl font-black text-[#0a0a0a]">{displayName}</h1>
          {profile.username && (
            <p className="text-sm text-zinc-500 mt-0.5">@{profile.username}</p>
          )}
        </div>

        {/* Role badges */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <RoleBadge role={globalRole} size="md" />
          {clubRoles.map((entry) => (
            <RoleBadge key={`${entry.clubId}-${entry.role}`} role={entry.role as AppRole} size="md" />
          ))}
        </div>

        {/* City + join date */}
        <div className="flex items-center gap-3 text-[11px] text-zinc-400">
          {profile.city && <span>{profile.city}</span>}
          {profile.city && <span>·</span>}
          <span>Miembro desde {formatJoinDate(profile.created_at)}</span>
        </div>
      </div>

      {/* Stats */}
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">
          Estadísticas
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Reservas Totales"
            value={stats.totalReservations}
            icon={Calendar}
            variant="default"
          />
          <StatCard
            label="Torneos"
            value={stats.tournamentsPlayed}
            icon={Trophy}
            variant="accent"
          />
          <StatCard
            label="Victorias"
            value={stats.tournamentsWon}
            icon={Target}
            variant="success"
          />
          <StatCard
            label="Puntos"
            value={stats.rankingScore}
            icon={Star}
            variant="warning"
          />
        </div>
      </section>

      {/* Edit form */}
      <section>
        <ProfileEditForm profile={profile} />
      </section>
    </div>
  )
}
