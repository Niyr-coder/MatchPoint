import { TESTIMONIALS } from "@/lib/constants"
import { ScrollReveal } from "@/components/shared/ScrollReveal"
import type { Testimonial } from "@/types"

function StarRating({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-0.5 mb-4">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5 text-primary fill-current" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function TestimonialCard({ testimonial, index }: { testimonial: Testimonial; index: number }) {
  return (
    <ScrollReveal delay={index * 0.1}>
      <div className="bg-muted border border-border rounded-2xl p-7 h-full flex flex-col transition-all duration-300 hover:border-primary/30 hover:shadow-[0_4px_20px_rgba(16,185,129,0.06)]">
        <StarRating />
        <p className="text-foreground font-medium leading-relaxed mb-6 flex-1" style={{ fontSize: 16 }}>
          &ldquo;{testimonial.quote}&rdquo;
        </p>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-emerald-700 flex-shrink-0 flex items-center justify-center text-white text-xs font-black">
            {testimonial.name.charAt(0)}
          </div>
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
