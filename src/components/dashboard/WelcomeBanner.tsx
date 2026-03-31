"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Profile } from "@/types"
import type { PlayerStats } from "@/lib/stats/queries"

interface WelcomeBannerProps {
  profile: Profile
  date: string
  stats: PlayerStats
}

const SPORTS = ["Fútbol", "Pádel", "Tenis", "Pickleball"]

export function WelcomeBanner({ profile, date, stats }: WelcomeBannerProps) {
  const firstName = profile.first_name ?? "Jugador"
  const displayName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.full_name ||
    "Jugador"

  const initials = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join("")

  const statItems = [
    { label: "Torneos jugados", value: stats.tournamentsPlayed.toString() },
    { label: "Reservas este mes", value: stats.reservationsThisMonth.toString() },
    { label: "Puntos ranking", value: stats.rankingScore.toString() },
  ]

  return (
    <div className="animate-fade-in-up relative rounded-2xl overflow-hidden p-6 md:p-8 bg-white border border-zinc-100 shadow-sm">
      {/* Top accent stripe */}
      <div className="h-1.5 w-full absolute top-0 left-0 right-0 bg-[#1a56db]" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Avatar */}
        <Avatar className="size-16 shrink-0 ring-2 ring-zinc-200">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
          <AvatarFallback className="bg-zinc-100 text-zinc-700 text-xl font-black">
            {initials || "J"}
          </AvatarFallback>
        </Avatar>

        {/* Name + date + sports */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1a56db] mb-1">
            Bienvenido de vuelta
          </p>
          <h1
            className="font-black text-zinc-900 uppercase leading-[0.9] tracking-[-0.03em] truncate"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)" }}
          >
            Hola, {firstName}.
          </h1>
          <p className="mt-1.5 text-zinc-400 text-sm capitalize">{date}</p>

          {/* Sport chips */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {SPORTS.map((sport) => (
              <span
                key={sport}
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
              >
                {sport}
              </span>
            ))}
          </div>
        </div>

        {/* Mini stats */}
        <div className="flex gap-6 shrink-0 sm:border-l sm:border-zinc-200 sm:pl-6">
          {statItems.map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-xl font-black text-zinc-900">{value}</p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mt-0.5">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
