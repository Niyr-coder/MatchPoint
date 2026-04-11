import { PARTNER_CLUBS } from "@/lib/constants"

export function SocialProofBar() {
  const doubled = [...PARTNER_CLUBS, ...PARTNER_CLUBS]
  return (
    <section className="bg-card py-5 border-y border-border overflow-hidden">
      <div className="flex items-center gap-16 animate-marquee whitespace-nowrap">
        {doubled.map((club, i) => (
          <span key={i} className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/40 flex-shrink-0">
            {club}
          </span>
        ))}
      </div>
    </section>
  )
}
