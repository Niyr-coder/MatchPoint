import { TESTIMONIALS } from "@/lib/constants"
import type { Testimonial } from "@/types"

function TestimonialCard({ testimonial, index }: { testimonial: Testimonial; index: number }) {
  return (
    <div
      className="p-8 rounded-2xl border border-[#e5e5e5] bg-[#fafafa] animate-fade-in-up"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex gap-0.5 mb-5">
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className="text-[#16a34a] text-sm">★</span>
        ))}
      </div>
      <p className="text-[#0a0a0a] font-medium leading-relaxed mb-6">&quot;{testimonial.quote}&quot;</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#16a34a]/10 flex items-center justify-center text-lg flex-shrink-0">
          {testimonial.emoji}
        </div>
        <div>
          <p className="text-sm font-black text-[#0a0a0a] uppercase tracking-tight">{testimonial.name}</p>
          <p className="text-xs text-[#737373]">{testimonial.sport} · {testimonial.city}</p>
        </div>
      </div>
    </div>
  )
}

export function TestimonialsSection() {
  return (
    <section id="comunidad" className="bg-white py-24 border-t border-[#e5e5e5]">
      <div className="container mx-auto px-6 sm:px-8">
        <p className="label-green">Comunidad</p>
        <h2
          className="font-black text-[#0a0a0a] uppercase leading-[0.88] tracking-[-0.03em] mb-16 max-w-2xl"
          style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
        >
          ELLOS YA JUEGAN.<br />TU TURNO.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={i} testimonial={t} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
