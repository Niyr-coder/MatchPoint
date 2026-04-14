import Image from "next/image"
import { Trophy, MapPin, Calendar, Star } from "lucide-react"
import type { Profile } from "@/types"
import { BADGE_CONFIG } from "@/features/badges/constants"
import type { PlayerBadge } from "@/features/badges/types"

const SPORT_LABELS: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
}

function getAge(dob: string): number {
  const today = new Date()
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function formatJoinDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    month: "long",
    year: "numeric",
  })
}

interface PlayerHeroSectionProps {
  profile: Profile
  displayName: string
  rating: number
  rankingPosition: number | null
  badges?: PlayerBadge[]
}

export function PlayerHeroSection({
  profile,
  displayName,
  rating,
  rankingPosition,
  badges = [],
}: PlayerHeroSectionProps) {
  const location = [profile.city, profile.province].filter(Boolean).join(", ")
  const age = profile.date_of_birth ? getAge(profile.date_of_birth) : null
  const preferredSport = profile.preferred_sport
    ? SPORT_LABELS[profile.preferred_sport] ?? profile.preferred_sport
    : null

  return (
    <div className="rounded-2xl bg-card border border-border p-6 flex flex-col items-center gap-5">
      {/* Avatar */}
      <div className="size-24 rounded-full bg-foreground flex items-center justify-center shrink-0 overflow-hidden">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={displayName}
            width={96}
            height={96}
            className="size-24 object-cover"
          />
        ) : (
          <span className="text-3xl font-black text-white">
            {getInitials(displayName)}
          </span>
        )}
      </div>

      {/* Name + username */}
      <div className="text-center">
        <h1 className="text-2xl font-black text-foreground">{displayName}</h1>
        {profile.username && (
          <p className="text-sm text-zinc-500 mt-0.5">@{profile.username}</p>
        )}
      </div>

      {badges.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {badges.map((badge) => {
            const cfg = BADGE_CONFIG[badge.badge_type]
            return (
              <span key={badge.id} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${cfg.color}`} title={cfg.label}>
                {cfg.emoji} {cfg.label}
              </span>
            )
          })}
        </div>
      )}

      {/* Rating + Ranking row */}
      <div className="flex items-center gap-4">
        {rating > 0 && (
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1">
              <Star className="size-3.5 text-yellow-500 fill-yellow-500" />
              <span className="text-2xl font-black text-foreground leading-none">
                {rating.toFixed(1)}
              </span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Rating
            </span>
          </div>
        )}

        {rating > 0 && rankingPosition && (
          <div className="w-px h-8 bg-border" />
        )}

        {rankingPosition && (
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1">
              <Trophy className="size-3.5 text-foreground" />
              <span className="text-2xl font-black text-foreground leading-none">
                #{rankingPosition}
              </span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Ranking
            </span>
          </div>
        )}
      </div>

      {/* Info pills row */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {age !== null && (
          <span className="flex items-center gap-1.5 bg-muted border border-border rounded-full px-3 py-1.5 text-[11px] font-bold text-zinc-600">
            {age} años
          </span>
        )}
        {location && (
          <span className="flex items-center gap-1.5 bg-muted border border-border rounded-full px-3 py-1.5 text-[11px] font-bold text-zinc-600">
            <MapPin className="size-3 shrink-0" />
            {location}
          </span>
        )}
        {preferredSport && (
          <span className="flex items-center gap-1.5 bg-muted border border-border rounded-full px-3 py-1.5 text-[11px] font-bold text-zinc-600">
            🏓 {preferredSport}
          </span>
        )}
        <span className="flex items-center gap-1.5 bg-muted border border-border rounded-full px-3 py-1.5 text-[11px] font-bold text-zinc-600">
          <Calendar className="size-3 shrink-0" />
          Desde {formatJoinDate(profile.created_at)}
        </span>
      </div>
    </div>
  )
}
