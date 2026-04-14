import { Building2, MapPin, Phone } from "lucide-react"
import type { Club } from "@/features/clubs/types"
import { SPORT_LABELS } from "@/lib/sports/config"
import { JoinClubButton } from "./JoinClubButton"

interface ClubProfileHeroProps {
  club: Club
  sports: string[]
  isMember: boolean
}

export function ClubProfileHero({ club, sports, isMember }: ClubProfileHeroProps) {
  return (
    <div className="flex flex-col gap-0">
      {/* Cover */}
      <div className="relative w-full h-48 rounded-t-2xl overflow-hidden bg-foreground">
        {club.cover_url ? (
          <img src={club.cover_url} alt={club.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="size-12 text-white/20" />
          </div>
        )}
        {club.logo_url && (
          <div className="absolute bottom-0 left-5 translate-y-1/2 size-16 rounded-full border-4 border-background overflow-hidden bg-card shadow-lg">
            <img src={club.logo_url} alt={`Logo ${club.name}`} className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-4 pt-10 pb-6 px-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-black text-foreground leading-tight">{club.name}</h1>
            {(club.city || club.province) && (
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3 text-zinc-400 shrink-0" />
                <span className="text-xs text-zinc-500">
                  {[club.city, club.province].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
            {sports.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {sports.map((sport) => (
                  <span key={sport} className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border bg-muted text-foreground border-border">
                    {SPORT_LABELS[sport as keyof typeof SPORT_LABELS] ?? sport}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0">
            <JoinClubButton clubId={club.id} clubSlug={club.slug} initialIsMember={isMember} />
          </div>
        </div>
        {club.description && (
          <p className="text-sm text-zinc-500 leading-relaxed">{club.description}</p>
        )}
        {club.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="size-3 text-zinc-400 shrink-0" />
            <span className="text-xs text-zinc-500">{club.phone}</span>
          </div>
        )}
      </div>
    </div>
  )
}
