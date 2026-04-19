import { TESTIMONIALS } from "@/lib/constants"
import { ScrollReveal } from "@/components/shared/ScrollReveal"
import type { Testimonial } from "@/types"

function TestimonialCard({ testimonial, index }: { testimonial: Testimonial; index: number }) {
  return (
    <ScrollReveal delay={index * 0.1}>
      <div className="bg-muted border border-border rounded-2xl p-7 h-full">
        <div className="text-primary text-[32px] leading-[0.5] font-black select-none">&quot;</div>
        <p className="text-foreground font-medium leading-relaxed mt-3 mb-6" style={{ fontSize: 17 }}>
          {testimonial.quote}
        </p>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-emerald-700 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-bold text-foreground">{testimonial.name}</p>
            <p className="text-[11px] text-muted-foreground">Nivel 3.5 · {testimonial.city}</p>
          </div>
        </div>
      </div>
    </ScrollReveal>
  )
}

export function TestimonialsSection() {
  const playerTestimonials = TESTIMONIALS.slice(0, 3)

  return (
    <section id="testimonials" className="bg-white py-24 px-6 sm:px-8">
      <div className="container mx-auto" style={{ maxWidth: 1280 }}>
        <ScrollReveal>
          <span className="chip mb-4">
            <span className="chip-dot" /> Lo que dicen
          </span>
          <h2
            className="font-black text-foreground uppercase leading-[0.95] tracking-[-0.03em]"
            style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", margin: "16px 0 48px" }}
          >
            La comunidad habla<span className="text-primary">.</span>
          </h2>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {playerTestimonials.map((t, i) => (
            <TestimonialCard key={i} testimonial={t} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
