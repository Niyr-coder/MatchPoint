"use client"

import { ArrowRight } from "lucide-react"
import { ScrollReveal } from "@/components/shared/ScrollReveal"

export function CtaSection() {
  return (
    <section id="waitlist" className="relative section-dark py-24 overflow-hidden">
      {/* Radial green glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(22,163,74,0.15),transparent_60%)] pointer-events-none" />

      <div className="relative z-10 container mx-auto px-6 sm:px-8 text-center max-w-4xl">
        <ScrollReveal>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary block mb-6 text-center">
            Únete — Acceso Anticipado
          </p>

          <h2
            className="font-black text-white uppercase leading-[0.88] tracking-[-0.03em] mb-6"
            style={{ fontSize: "clamp(3rem, 8vw, 8rem)" }}
          >
            NO TE QUEDES<br />FUERA.
          </h2>

          <p className="text-white/60 text-lg font-medium mb-10 max-w-xl mx-auto">
            Acceso anticipado gratuito para los primeros 500 registrados.{" "}
            <br />
            <span className="text-white font-semibold">Después, será de pago.</span>
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="flex justify-center">
            <a
              href="/login"
              className="btn-pill bg-card text-foreground px-12 py-4 text-base inline-flex items-center gap-2"
            >
              Únete Gratis <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </ScrollReveal>

        {/* Cupos bar */}
        <ScrollReveal delay={0.3}>
          <div className="mt-8 flex flex-col items-center gap-2">
            <div className="w-48 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "74%" }} />
            </div>
            <span className="text-xs text-white/40 font-semibold tracking-wider">370 / 500 CUPOS TOMADOS</span>
          </div>
        </ScrollReveal>

        {/* Social proof */}
        <ScrollReveal delay={0.4} variant="fade-in">
          <div className="flex items-center justify-center gap-3 mt-10">
            <div className="flex -space-x-2">
              {["🏓", "🎾", "🏸", "⚽"].map((emoji, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-white/10 border-2 border-card flex items-center justify-center text-sm"
                >
                  {emoji}
                </div>
              ))}
            </div>
            <p className="text-xs text-white/40">
              <span className="text-white font-semibold">+500</span> deportistas ya registrados
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
