"use client"

import Image from "next/image"
import { ArrowRight, ChevronDown, Building2 } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative w-full min-h-[92vh] flex items-end overflow-hidden bg-black">
      {/* Background Image with subtle zoom */}
      <div className="absolute inset-0 z-0 animate-zoom-fade-in">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <Image
          src="/images/landing/hero.png"
          alt="Sports Complex"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Overlays */}
      <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(22,163,74,0.15),transparent_70%)] z-10 pointer-events-none" />

      {/* Copy — bottom-left */}
      <div className="relative z-20 container mx-auto px-6 sm:px-8 pb-16 md:pb-24">
        {/* Label */}
        <p
          className="animate-fade-in label-green"
          style={{ animationDelay: "0.1s" }}
        >
          LA COMUNIDAD #1 DE PICKLEBALL EN ECUADOR
        </p>

        {/* Headline — two separate phrases, period in emerald signals full stop */}
        <h1
          className="animate-fade-in-up-16 font-black text-white uppercase tracking-[-0.03em] mb-8"
          style={{ fontSize: "clamp(3.5rem, 10vw, 9rem)", animationDelay: "0.15s" }}
        >
          <span className="block leading-[0.92] mb-3">
            JUEGA MÁS<span className="text-primary">.</span>
          </span>
          <span className="block leading-[0.92]">
            JUEGA MEJOR<span className="text-primary">.</span>
          </span>
        </h1>

        {/* Subheading */}
        <p
          className="animate-fade-in-up text-white/70 text-lg md:text-xl max-w-md mb-10 font-medium leading-relaxed"
          style={{ animationDelay: "0.3s" }}
        >
          Encuentra rivales de tu nivel, reserva canchas al instante y sube tu ranking en{" "}
          <span className="text-white">Pickleball.</span>
        </p>

        {/* CTAs — dual audience */}
        <div
          className="animate-fade-in-up flex flex-wrap gap-4"
          style={{ animationDelay: "0.4s" }}
        >
          <a
            href="/login"
            className="btn-pill bg-card text-foreground px-10 py-3.5 inline-flex items-center gap-2"
          >
            Empieza a Jugar <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#clubes"
            className="btn-pill border border-white/30 text-white hover:bg-card hover:text-foreground px-8 py-3.5 inline-flex items-center gap-2"
          >
            <Building2 className="w-4 h-4" />
            Registra tu Club
          </a>
        </div>

        {/* Social proof */}
        <div className="flex items-center gap-3 mt-8 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
          <div className="flex -space-x-2">
            {["C", "M", "A", "L"].map((e, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-card/10 border border-white/20 flex items-center justify-center text-xs font-black text-white/70">{e}</div>
            ))}
          </div>
          <p className="text-xs text-white/50">
            <span className="text-white font-semibold">+500</span> deportistas ya en la plataforma
          </p>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce z-10">
        <ChevronDown className="w-6 h-6 text-white/30" />
      </div>
    </section>
  )
}
