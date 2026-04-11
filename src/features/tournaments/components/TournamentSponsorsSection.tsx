import { Star } from "lucide-react"
import type { TournamentExtras } from "@/features/tournaments/types"

interface Props {
  extras: TournamentExtras
}

export function TournamentSponsorsSection({ extras }: Props) {
  const patrocinador = extras.patrocinador
  if (!patrocinador?.enabled) return null

  const sponsors = patrocinador.sponsors ?? []
  const legacyName = patrocinador.name

  // Support both new sponsors array and legacy name field
  const items: Array<{ name: string; logo_url?: string }> =
    sponsors.length > 0 ? sponsors : legacyName ? [{ name: legacyName }] : []

  if (items.length === 0) return null

  return (
    <div className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Star className="size-4 text-violet-500" />
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Auspiciantes</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {items.map((sponsor, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-border bg-muted/30"
          >
            {sponsor.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sponsor.logo_url}
                alt={sponsor.name}
                className="h-6 w-auto object-contain"
              />
            ) : (
              <span className="size-6 rounded-full bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center text-[10px] font-black text-violet-600">
                {sponsor.name.charAt(0).toUpperCase()}
              </span>
            )}
            <p className="text-xs font-black text-foreground">{sponsor.name}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
