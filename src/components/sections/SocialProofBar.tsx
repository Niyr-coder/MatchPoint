import { PARTNER_CLUBS } from "@/lib/constants"

export function SocialProofBar() {
  const doubled = [...PARTNER_CLUBS, ...PARTNER_CLUBS]
  return (
    <section className="bg-white py-5 border-y border-[#e5e5e5] overflow-hidden">
      <div className="flex items-center gap-16 animate-marquee whitespace-nowrap">
        {doubled.map((club, i) => (
          <span key={i} className="text-xs font-black uppercase tracking-[0.2em] text-[#d4d4d4] flex-shrink-0">
            {club}
          </span>
        ))}
      </div>
    </section>
  )
}
