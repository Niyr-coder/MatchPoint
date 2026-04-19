"use client"

import Image from "next/image"
import { ArrowRight, ChevronDown } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative w-full flex items-center overflow-hidden bg-black" style={{ minHeight: "100svh" }}>
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
      <div className="absolute inset-0 z-[2] bg-black/60" />

      {/* Bottom fade — stronger to blend into next section */}
      <div className="absolute left-0 right-0 bottom-0 h-2/3 z-[3] bg-gradient-to-t from-black via-black/75 to-transparent" />

      {/* Radial green glow — bottom-left accent */}
      <div className="absolute inset-0 z-[4] bg-[radial-gradient(ellipse_at_15%_85%,rgba(16,185,129,0.22),transparent_55%)]" />

      {/* Top-right subtle glow */}
      <div className="absolute inset-0 z-[4] bg-[radial-gradient(ellipse_at_85%_10%,rgba(16,185,129,0.08),transparent_45%)]" />

      {/* Content */}
      <div className="relative z-10 w-full" style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(100px, 15vh, 160px) 32px clamp(120px, 18vh, 180px)" }}>
        {/* Chip badge */}
        <span className="chip mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <span className="chip-dot" /> La comunidad #1 de pickleball en Ecuador
        </span>

        {/* Headline */}
        <h1
          className="animate-fade-in-up-16 font-black text-white uppercase tracking-[-0.04em]"
          style={{ fontSize: "clamp(3.25rem, 9vw, 8.5rem)", lineHeight: 0.88, margin: "24px 0 0", maxWidth: 1000, animationDelay: "0.15s" }}
        >
          <span className="block">JUEGA MÁS<span className="text-primary">.</span></span>
          <span className="block" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.25)", color: "transparent" }}>JUEGA MEJOR<span style={{ WebkitTextStroke: "1px #10b981", color: "transparent" }}>.</span></span>
        </h1>

        {/* Accent line */}
        <div className="animate-fade-in" style={{ animationDelay: "0.28s", width: 56, height: 3, background: "#10b981", borderRadius: 9999, margin: "28px 0 0" }} />

        {/* Subheading */}
        <p
          className="animate-fade-in-up text-white/65 font-medium max-w-[520px]"
          style={{ fontSize: 17, lineHeight: 1.6, margin: "20px 0 40px", animationDelay: "0.35s" }}
        >
          Encuentra rivales de tu nivel, reserva canchas al instante y sube tu ranking.
          Todo en una sola app.
        </p>

        {/* CTAs */}
        <div className="animate-fade-in-up flex flex-wrap gap-3.5" style={{ animationDelay: "0.45s" }}>
          <a href="#waitlist" className="btn-pill-green px-7 py-3.5 text-sm inline-flex items-center gap-2 shadow-lg">
            Juega ahora <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#features"
            className="btn-pill border border-white/25 text-white hover:bg-white/8 hover:border-white/50 px-7 py-3.5 text-sm inline-flex items-center gap-2 transition-colors backdrop-blur-sm"
          >
            Ver cómo funciona
          </a>
        </div>

        {/* Social proof micro-line */}
        <div className="animate-fade-in flex items-center gap-3 mt-8" style={{ animationDelay: "0.6s" }}>
          <div className="flex -space-x-2">
            {[0,1,2,3].map(i => (
              <div key={i} className="w-7 h-7 rounded-full border-2 border-black bg-gradient-to-br from-emerald-400 to-emerald-700" style={{ opacity: 1 - i * 0.12 }} />
            ))}
          </div>
          <span className="text-white/45 text-xs font-medium">+5,000 jugadores activos</span>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce" style={{ animationDuration: "2s" }}>
        <a href="#deportes" aria-label="Scroll hacia abajo" className="flex flex-col items-center gap-1 text-white/30 hover:text-white/60 transition-colors">
          <ChevronDown className="w-5 h-5" />
        </a>
      </div>
    </section>
  )
}
