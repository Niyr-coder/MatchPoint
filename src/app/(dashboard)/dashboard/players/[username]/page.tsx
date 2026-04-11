import { authorizeOrRedirect } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { getPublicPlayerProfile } from "@/features/users/queries"
import { StatCard } from "@/components/shared/StatCard"
import { ArrowLeft, Trophy, Target, TrendingUp, Swords } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Profile } from "@/types"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
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
  const stats = await getPublicPlayerProfile(profile.id)

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

      {/* Profile hero */}
      <div className="flex flex-col items-center gap-4 py-8 border-b border-border">
        <div className="size-20 rounded-full bg-foreground flex items-center justify-center shrink-0 overflow-hidden">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={displayName}
              width={80}
              height={80}
              className="size-20 object-cover"
            />
          ) : (
            <span className="text-2xl font-black text-white">
              {getInitials(displayName)}
            </span>
          )}
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-black text-foreground">{displayName}</h1>
          {profile.username && (
            <p className="text-sm text-zinc-500 mt-0.5">@{profile.username}</p>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-zinc-400">
          {profile.city && <span>{profile.city}</span>}
          {profile.city && <span>·</span>}
          <span>Miembro desde {formatJoinDate(profile.created_at)}</span>
        </div>

        {stats.ranking_position && (
          <div className="flex items-center gap-1.5 bg-secondary text-foreground rounded-full px-4 py-1.5">
            <Trophy className="size-3.5" />
            <span className="text-[11px] font-black">
              #{stats.ranking_position} en el ranking
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">
          Estadísticas
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Partidos"
            value={stats.matches_played}
            icon={Swords}
            variant="default"
          />
          <StatCard
            label="Victorias"
            value={stats.matches_won}
            icon={Trophy}
            variant="accent"
          />
          <StatCard
            label="% Victorias"
            value={`${stats.win_rate}%`}
            icon={Target}
            variant="success"
          />
          <StatCard
            label="Racha actual"
            value={stats.current_streak}
            icon={TrendingUp}
            variant="warning"
          />
        </div>
      </section>

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
