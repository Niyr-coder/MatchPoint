import { PARTNER_CLUBS } from "@/lib/constants"

export function SocialProofBar() {
  const tripled = [...PARTNER_CLUBS, ...PARTNER_CLUBS, ...PARTNER_CLUBS]
  return (
    <section className="bg-[#0a0a0a] py-5 overflow-hidden border-b border-white/5">
      <div className="flex items-center gap-14 animate-marquee whitespace-nowrap">
        {tripled.map((club, i) => (
          <span
            key={i}
            className="text-[13px] font-bold tracking-[0.12em] uppercase text-white/50 flex-shrink-0"
          >
            <span className="text-primary mr-2.5">●</span>{club}
          </span>
        ))}
      </div>
    </section>
  )
}
