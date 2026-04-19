"use client"

import { useState } from "react"
import { ScrollReveal } from "@/components/shared/ScrollReveal"

export function CtaSection() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  return (
    <section id="waitlist" className="relative bg-[#0a0a0a] text-white py-28 overflow-hidden">
      {/* Radial green glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(16,185,129,0.2),transparent_60%)] pointer-events-none" />

      <div className="relative z-10 text-center" style={{ maxWidth: 900, margin: "0 auto", padding: "0 32px" }}>
        <ScrollReveal>
          <span className="chip mb-5">
            <span className="chip-dot" /> Acceso anticipado
          </span>
          <h2
            className="font-black text-white uppercase leading-[0.9] tracking-[-0.03em]"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", margin: "20px 0 24px" }}
          >
            Entra antes que<br />todos<span className="text-primary">.</span>
          </h2>
          <p className="text-white/60 mx-auto mb-9" style={{ fontSize: 17, maxWidth: 480 }}>
            Únete a la lista. Acceso prioritario, tarifas de fundador, y un rival esperándote.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <form
            onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}
            className="flex gap-2 mx-auto rounded-full border border-white/10 bg-white/[0.06] p-1.5"
            style={{ maxWidth: 460 }}
          >
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              type="email"
              required
              className="flex-1 bg-transparent border-0 text-white px-4 py-2.5 text-sm outline-none placeholder:text-white/30"
              style={{ fontFamily: "inherit" }}
            />
            <button type="submit" className="btn-pill-green px-5 py-2.5 text-[13px] shrink-0">
              {submitted ? "✓ Listo" : "Únete"}
            </button>
          </form>
          {submitted && (
            <p className="mt-4 text-[#34d399] text-[13px]">Te avisamos cuando abramos tu zona.</p>
          )}
        </ScrollReveal>
      </div>
    </section>
  )
}
