import { notFound } from "next/navigation"
import { createServiceClient } from "@/lib/supabase/server"
import { getPublicPlayerProfile } from "@/features/users/queries"
import { RoleBadge } from "@/components/shared/RoleBadge"
import { Calendar, MapPin, Trophy, Building2 } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"
import type { Profile, AppRole } from "@/types"

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const supabase = createServiceClient()
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

const SPORT_LABELS: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

function QuickStat({
  label,
  value,
  color = "zinc",
}: {
  label: string
  value: string | number
  color?: "green" | "blue" | "zinc"
}) {
  const colorMap = {
    green: "text-green-600",
    blue: "text-[#0a0a0a]",
    zinc: "text-zinc-800",
  }
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">{label}</p>
      <p className={`text-2xl font-black tracking-tight ${colorMap[color]}`}>{value}</p>
    </div>
  )
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = createServiceClient()

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single()

  if (!profileData) {
    notFound()
  }

  const profile = profileData as Profile & { username?: string; global_role?: AppRole }

  let playerProfile
  try {
    playerProfile = await getPublicPlayerProfile(profile.id)
  } catch {
    playerProfile = {
      rating: 0,
      ranking_position: null,
      matches_played: 0,
      matches_won: 0,
      current_streak: 0,
      win_rate: 0,
      recentMatches: [],
      clubs: [],
      sports: [],
    }
  }

  const displayName =
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    username

  const globalRole: AppRole = profile.global_role ?? "user"

  const streakDisplay =
    playerProfile.current_streak > 0
      ? `+${playerProfile.current_streak} 🔥`
      : String(playerProfile.current_streak)

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Top nav */}
      <header className="bg-white border-b border-[#e5e5e5]">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
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

      {/* Hero section */}
      <div className="bg-white border-b border-[#e5e5e5]">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-start gap-6">
            {/* Avatar with rating badge */}
            <div className="relative shrink-0">
              <div className="size-24 rounded-2xl bg-zinc-800 flex items-center justify-center">
                <span className="text-3xl font-black text-white">{getInitials(profile)}</span>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[#1d4ed8] text-white rounded-xl px-2 py-0.5 text-xs font-black whitespace-nowrap">
                {playerProfile.rating > 0
                  ? `★ ${playerProfile.rating.toFixed(2)}`
                  : "Sin rating"}
              </div>
            </div>

            {/* Name, username, meta */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-black uppercase tracking-tight text-[#0a0a0a] truncate">
                {displayName}
              </h1>
              <p className="text-zinc-400 text-sm mt-0.5">@{username}</p>

              <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400 flex-wrap">
                {profile.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" />
                    {profile.city}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  Desde {formatJoinDate(profile.created_at)}
                </span>
              </div>

              <div className="flex gap-2 mt-3">
                <RoleBadge role={globalRole} size="md" />
              </div>

              {playerProfile.sports.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {playerProfile.sports.map(({ sport, count }) => (
                    <span
                      key={sport}
                      className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-bold"
                    >
                      {SPORT_LABELS[sport] ?? sport} · {count} partidos
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#e5e5e5]">
            <QuickStat label="Partidos" value={playerProfile.matches_played} />
            <QuickStat label="Victorias" value={playerProfile.matches_won} color="green" />
            <QuickStat label="% Victorias" value={`${playerProfile.win_rate}%`} color="blue" />
            <QuickStat label="Racha" value={streakDisplay} />
          </div>
        </div>
      </div>

      {/* Main bento grid */}
      <main className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* Rating card */}
          <div className="bg-white border border-[#e5e5e5] rounded-2xl p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-3">
              Rating Matchpoint
            </p>
            <p className="text-5xl font-black text-[#1d4ed8]">
              {playerProfile.rating > 0 ? playerProfile.rating.toFixed(2) : "—"}
            </p>
            {playerProfile.ranking_position !== null ? (
              <p className="text-sm text-zinc-500 mt-2">
                #{playerProfile.ranking_position} en el ranking global
              </p>
            ) : (
              <p className="text-sm text-zinc-400 mt-2">Sin posición en ranking</p>
            )}
            <div className="mt-3 text-[10px] text-zinc-400 bg-zinc-50 rounded-xl p-3 leading-relaxed">
              ⚡ El rating solo se calcula en torneos y quedadas oficiales supervisadas.
            </div>
          </div>

          {/* Clubs card */}
          <div className="bg-white border border-[#e5e5e5] rounded-2xl p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-3">
              Clubes
            </p>
            {playerProfile.clubs.length === 0 ? (
              <p className="text-sm text-zinc-400">Sin clubes registrados</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {playerProfile.clubs.map((club) => (
                  <li key={club.id} className="flex items-center gap-2 text-sm text-zinc-700">
                    <Building2 className="size-4 text-zinc-400 shrink-0" />
                    <span className="font-medium truncate">{club.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right column: match history */}
        <div className="bg-white border border-[#e5e5e5] rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
              Historial de Partidos
            </p>
            <span className="text-[10px] text-zinc-400">Solo torneos y eventos oficiales</span>
          </div>

          {playerProfile.recentMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Trophy className="size-10 text-zinc-200" />
              <p className="text-sm font-bold text-zinc-500">Sin partidos registrados</p>
              <p className="text-xs text-zinc-400 max-w-xs">
                Los partidos de torneos y quedadas oficiales aparecerán aquí
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[#e5e5e5]">
              {playerProfile.recentMatches.map((match) => {
                const resultStyles = {
                  win: "bg-green-50 text-green-700 border border-green-200",
                  loss: "bg-red-50 text-red-700 border border-red-200",
                  draw: "bg-zinc-100 text-zinc-600 border border-zinc-200",
                } as const
                const resultLabels = {
                  win: "VICTORIA",
                  loss: "DERROTA",
                  draw: "EMPATE",
                } as const

                const matchDate = new Date(match.played_at).toLocaleDateString("es-EC", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })

                const sportLabel = SPORT_LABELS[match.sport] ?? match.sport
                const modalityStr = match.modality ? ` · ${match.modality}` : ""

                return (
                  <div key={match.id} className="flex items-center gap-3 py-3">
                    <span
                      className={`shrink-0 text-[10px] font-black rounded-full px-2.5 py-1 ${resultStyles[match.result]}`}
                    >
                      {resultLabels[match.result]}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-800 truncate">{match.event_name}</p>
                      <p className="text-xs text-zinc-400 truncate">
                        {sportLabel}{modalityStr} · {matchDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {match.score && (
                        <span className="text-sm font-mono text-zinc-600">{match.score}</span>
                      )}
                      {match.is_official && (
                        <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-black">
                          OFICIAL
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
