"use client"

import { useState } from "react"
import { ArrowRight, Lock } from "lucide-react"
import { ScrollReveal } from "@/components/shared/ScrollReveal"

export function CtaSection() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  return (
    <section id="waitlist" className="relative bg-[#060606] text-white py-28 overflow-hidden">
      {/* Multi-layered glow system */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.18),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(16,185,129,0.08),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_60%,rgba(16,185,129,0.06),transparent_45%)] pointer-events-none" />

      {/* Top accent line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[240px] h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="relative z-10 text-center" style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px" }}>
        <ScrollReveal>
          <span className="chip mb-5">
            <span className="chip-dot" /> Acceso anticipado
          </span>
          <h2
            className="font-black text-white uppercase leading-[0.88] tracking-[-0.04em]"
            style={{ fontSize: "clamp(2.75rem, 6.5vw, 5.5rem)", margin: "20px 0 0" }}
          >
            Entra antes que<br /><span className="text-primary">todos</span><span className="text-white">.</span>
          </h2>
          <p className="text-white/50 mx-auto mt-6 mb-9 leading-relaxed" style={{ fontSize: 16, maxWidth: 420 }}>
            Acceso prioritario, tarifas de fundador, y un rival esperándote desde el día uno.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <form
            onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}
            className="flex gap-2 mx-auto rounded-full border border-white/10 bg-white/[0.05] p-1.5 transition-all duration-200 focus-within:border-white/20 focus-within:bg-white/[0.07]"
            style={{ maxWidth: 440 }}
          >
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              type="email"
              required
              className="flex-1 bg-transparent border-0 text-white px-4 py-2.5 text-sm outline-none placeholder:text-white/25"
              style={{ fontFamily: "inherit" }}
            />
            <button type="submit" className="btn-pill-green px-5 py-2.5 text-[13px] shrink-0 inline-flex items-center gap-1.5">
              {submitted ? "Listo" : <>Únete <ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </form>

          {submitted ? (
            <p className="mt-4 text-[#34d399] text-[13px] font-medium">Te avisamos cuando abramos tu zona.</p>
          ) : (
            <p className="mt-3.5 flex items-center justify-center gap-1.5 text-white/25 text-[11px]">
              <Lock className="w-2.5 h-2.5" />
              Sin spam. Sin compromisos. Cancela cuando quieras.
            </p>
          )}
        </ScrollReveal>

        {/* Social proof mini bar */}
        <ScrollReveal delay={0.25}>
          <div className="mt-10 pt-8 border-t border-white/[0.06] flex items-center justify-center gap-6 flex-wrap">
            {["5,000+ jugadores", "4 ciudades", "Gratis para empezar"].map((item) => (
              <span key={item} className="flex items-center gap-1.5 text-white/30 text-xs font-medium">
                <span className="w-1 h-1 rounded-full bg-primary/60 flex-shrink-0" />
                {item}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
