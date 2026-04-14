import type { ClubProfileCourt } from "@/features/clubs/queries/club-profile"

interface ClubCourtsSectionProps {
  courts: ClubProfileCourt[]
}

export function ClubCourtsSection({ courts }: ClubCourtsSectionProps) {
  if (courts.length === 0) {
    return (
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-black uppercase tracking-wide text-foreground">Canchas disponibles</h2>
        <p className="text-xs text-zinc-400">Este club aún no tiene canchas registradas.</p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-foreground">Canchas disponibles</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {courts.map((court) => (
          <div key={court.id} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
            <span className="text-sm font-black text-foreground">{court.name}</span>
            <span className="text-xs text-zinc-500">
              ${court.price_per_hour.toFixed(2)}<span className="text-zinc-400"> / hora</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
