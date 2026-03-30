import { notFound } from "next/navigation"
import { createServiceClient } from "@/lib/supabase/server"
import { getPlayerStats } from "@/lib/stats/queries"
import { RoleBadge } from "@/components/shared/RoleBadge"
import { StatCard } from "@/components/shared/StatCard"
import { Calendar, Trophy, Target, Star } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"
import type { Profile, AppRole } from "@/types"

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from("profiles")
    .select("full_name, first_name, last_name, city")
    .eq("username", username)
    .single()

  if (!data) {
    return { title: "Perfil no encontrado · MATCHPOINT" }
  }

  const name =
    data.full_name ||
    [data.first_name, data.last_name].filter(Boolean).join(" ") ||
    username

  return {
    title: `${name} · MATCHPOINT`,
    description: data.city ? `Jugador de ${data.city}` : "Perfil de jugador en MATCHPOINT",
  }
}

function getInitials(profile: Profile & { username?: string }): string {
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

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createServiceClient()

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single()

  if (!profileData) {
    notFound()
  }

  const profile = profileData as Profile & { username?: string; global_role?: AppRole }
  const stats = await getPlayerStats(profile.id)

  const displayName =
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    username

  const globalRole: AppRole = profile.global_role ?? "user"

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <header className="bg-white border-b border-[#e5e5e5]">
        <div className="max-w-screen-md mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-black text-lg tracking-tight text-[#0a0a0a]"
          >
            <div className="size-2 rounded-full bg-[#16a34a]" />
            MATCHPOINT
          </Link>
          <Link
            href="/dashboard"
            className="text-xs font-black uppercase tracking-[0.1em] text-zinc-400 hover:text-[#0a0a0a] transition-colors"
          >
            Mi Dashboard →
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-screen-md mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-[#e5e5e5] overflow-hidden">
          {/* Profile hero */}
          <div className="flex flex-col items-center gap-4 p-10 border-b border-[#e5e5e5]">
            {/* Avatar */}
            <div className="size-20 rounded-full bg-[#1a56db] flex items-center justify-center shrink-0">
              <span className="text-2xl font-black text-white">
                {getInitials(profile)}
              </span>
            </div>

            {/* Name & username */}
            <div className="text-center">
              <h1 className="text-2xl font-black text-[#0a0a0a]">{displayName}</h1>
              <p className="text-sm text-zinc-400 mt-0.5">@{username}</p>
            </div>

            {/* Role badge */}
            <RoleBadge role={globalRole} size="md" />

            {/* City + join date */}
            <div className="flex items-center gap-3 text-[11px] text-zinc-400">
              {profile.city && <span>{profile.city}</span>}
              {profile.city && <span>·</span>}
              <span>Miembro desde {formatJoinDate(profile.created_at)}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">
              Estadísticas
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Reservas"
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
          </div>
        </div>
      </main>
    </div>
  )
}
