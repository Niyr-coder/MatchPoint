"use client"

import Image from "next/image"
import { ArrowRight } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative w-full flex items-center overflow-hidden bg-black" style={{ minHeight: 720 }}>
      {/* Background image with zoom entrance */}
      <div className="absolute inset-0 z-0 animate-zoom-fade-in">
        <Image
          src="/images/landing/hero.png"
          alt="Sports Complex"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Fallback gradient when image is missing */}
      <div className="absolute inset-0 z-[1]" style={{
        backgroundImage: "linear-gradient(135deg, #064e3b 0%, #0a0a0a 40%, #000 100%), radial-gradient(ellipse at 70% 30%, rgba(16,185,129,0.25), transparent 60%)",
        backgroundBlendMode: "overlay",
      }} />

      {/* Dark veil */}
      <div className="absolute inset-0 z-[2] bg-black/55" />

      {/* Bottom fade */}
      <div className="absolute left-0 right-0 bottom-0 h-2/3 z-[3] bg-gradient-to-t from-black via-black/70 to-transparent" />

      {/* Radial green glow */}
      <div className="absolute inset-0 z-[4] bg-[radial-gradient(ellipse_at_20%_80%,rgba(16,185,129,0.18),transparent_60%)]" />

      {/* Content */}
      <div className="relative z-10 w-full" style={{ maxWidth: 1280, margin: "0 auto", padding: "120px 32px 140px" }}>
        {/* Chip badge */}
        <span className="chip mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <span className="chip-dot" /> La comunidad #1 de pickleball en Ecuador
        </span>

        {/* Headline */}
        <h1
          className="animate-fade-in-up-16 font-black text-white uppercase tracking-[-0.03em]"
          style={{ fontSize: "clamp(3rem, 8vw, 7.5rem)", lineHeight: 0.9, margin: "24px 0 0", maxWidth: 960, animationDelay: "0.15s" }}
        >
          <span className="block">JUEGA MÁS<span className="text-primary">.</span></span>
          <span className="block">JUEGA MEJOR<span className="text-primary">.</span></span>
        </h1>

        {/* Subheading */}
        <p
          className="animate-fade-in-up text-white/70 font-medium max-w-[580px]"
          style={{ fontSize: 18, lineHeight: 1.55, margin: "32px 0 40px", animationDelay: "0.3s" }}
        >
          Encuentra rivales de tu nivel, reserva canchas al instante y sube tu ranking.
          Todo en una sola app.
        </p>

        {/* CTAs */}
        <div className="animate-fade-in-up flex flex-wrap gap-3.5" style={{ animationDelay: "0.4s" }}>
          <a href="#waitlist" className="btn-pill-green px-7 py-3.5 text-sm inline-flex items-center gap-2">
            Juega ahora <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#features"
            className="btn-pill border border-white/30 text-white hover:bg-white/10 hover:border-white px-7 py-3.5 text-sm inline-flex items-center gap-2 transition-colors"
          >
            Ver cómo funciona
          </a>
        </div>
      </div>
    </section>
  )
}
