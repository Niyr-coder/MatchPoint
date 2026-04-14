import { authorizeOrRedirect } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { getPublicPlayerProfile } from "@/features/users/queries"
import { getPlayerBadges } from "@/features/badges/queries"
import { StatCard } from "@/components/shared/StatCard"
import { PlayerHeroSection } from "@/features/users/components/PlayerHeroSection"
import { RecentMatchesList } from "@/features/users/components/RecentMatchesList"
import { PickleballRatingWidget } from "@/features/users/components/PickleballRatingWidget"
import { ArrowLeft, Trophy, Target, TrendingUp, Swords } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Profile } from "@/types"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SPORT_LABELS: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  await authorizeOrRedirect()
  const { username: slug } = await params

  const supabase = createServiceClient()

  // Accept both clean usernames (/players/johndoe) and legacy UUID links (/players/<uuid>)
  const { data: profileData } = UUID_REGEX.test(slug)
    ? await supabase.from("profiles").select("*").eq("id", slug).single()
    : await supabase.from("profiles").select("*").eq("username", slug).single()

  if (!profileData) notFound()

  const profile = profileData as Profile
  const [stats, badges] = await Promise.all([
    getPublicPlayerProfile(profile.id),
    getPlayerBadges(profile.id),
  ])

  const displayName =
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "Jugador"

  return (
    <div className="flex flex-col gap-8">
      {/* Back */}
      <Link
        href="/dashboard/ranking"
        className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-zinc-400 hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-3.5" />
        Ranking
      </Link>

      {/* Hero */}
      <PlayerHeroSection
        profile={profile}
        displayName={displayName}
        rating={stats.rating}
        rankingPosition={stats.ranking_position}
        badges={badges}
      />

      {/* Stats */}
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">
          Estadísticas
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Partidos" value={stats.matches_played} icon={Swords} variant="default" />
          <StatCard label="Victorias" value={stats.matches_won} icon={Trophy} variant="accent" />
          <StatCard label="% Victorias" value={`${stats.win_rate}%`} icon={Target} variant="success" />
          <StatCard label="Racha actual" value={stats.current_streak} icon={TrendingUp} variant="warning" />
        </div>
      </section>

      {/* Pickleball rating (only if profile exists) */}
      {stats.pickleballProfile && (
        <section>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">
            Pickleball
          </p>
          <PickleballRatingWidget profile={stats.pickleballProfile} />
        </section>
      )}

      {/* Match history */}
      <RecentMatchesList matches={stats.recentMatches} />

      {/* Sports */}
      {stats.sports.length > 0 && (
        <section>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">
            Deportes
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.sports.map(({ sport, count }) => (
              <div
                key={sport}
                className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2"
              >
                <span className="text-xs font-black text-foreground">
                  {SPORT_LABELS[sport] ?? sport}
                </span>
                <span className="text-[10px] text-zinc-400">{count} reservas</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Clubs */}
      {stats.clubs.length > 0 && (
        <section>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">
            Clubes
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.clubs.map((club) => (
              <div
                key={club.id}
                className="bg-card border border-border rounded-full px-4 py-2 text-xs font-black text-foreground"
              >
                {club.name}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
