"use client"

import Link from "next/link"
import { Building2, MapPin, Phone } from "lucide-react"
import type { ClubWithSports } from "@/features/clubs/queries/clubs"

const SPORT_LABEL: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

interface ClubCardProps {
  club: ClubWithSports
  index?: number
}

export function ClubCard({ club, index = 0 }: ClubCardProps) {
  return (
    <Link
      href={`/dashboard/clubs/${club.slug}`}
      className="animate-fade-in-up rounded-2xl bg-card border border-border overflow-hidden flex flex-col hover:border-foreground/40 transition-colors"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* Cover */}
      {club.cover_url ? (
        <img
          src={club.cover_url}
          alt={club.name}
          className="w-full h-36 object-cover"
        />
      ) : (
        <div className="w-full h-36 bg-foreground flex items-center justify-center">
          <Building2 className="size-10 text-white/30" />
        </div>
      )}

      <div className="flex flex-col gap-3 p-5 flex-1">
        {/* Name */}
        <h3 className="text-sm font-black text-foreground leading-tight">
          {club.name}
        </h3>

        {/* Location */}
        {(club.city || club.province) && (
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3 text-zinc-400 shrink-0" />
            <span className="text-[11px] text-zinc-500">
              {[club.city, club.province].filter(Boolean).join(", ")}
            </span>
          </div>
        )}

        {/* Sport badges */}
        {club.sports.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {club.sports.map((sport) => (
              <span
                key={sport}
                className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border bg-muted text-foreground border-border"
              >
                {SPORT_LABEL[sport] ?? sport}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        {club.phone && (
          <div className="mt-auto pt-3 border-t border-border flex items-center gap-1.5">
            <Phone className="size-3 text-zinc-400 shrink-0" />
            <span className="text-[11px] text-zinc-500">{club.phone}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
