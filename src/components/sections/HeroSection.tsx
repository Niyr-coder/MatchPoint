"use client"

import Image from "next/image"
import { ArrowRight, ChevronDown } from "lucide-react"

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

      {/* Copy — bottom-left like PICKLEZONE */}
      <div className="relative z-20 container mx-auto px-6 sm:px-8 pb-16 md:pb-24">
        {/* Label */}
        <p
          className="animate-fade-in label-green"
          style={{ animationDelay: "0.1s" }}
        >
          LA COMUNIDAD #1 DE DEPORTES DE RAQUETA EN ECUADOR
        </p>

        {/* Headline */}
        <h1
          className="animate-fade-in-up-16 font-black text-white uppercase leading-[0.88] tracking-[-0.03em] mb-8"
          style={{ fontSize: "clamp(3.5rem, 10vw, 9rem)", animationDelay: "0.15s" }}
        >
          JUEGA MÁS.<br />JUEGA MEJOR.
        </h1>

        {/* Subheading */}
        <p
          className="animate-fade-in-up text-white/70 text-lg md:text-xl max-w-md mb-10 font-medium leading-relaxed"
          style={{ animationDelay: "0.3s" }}
        >
          Encuentra rivales de tu nivel, reserva canchas al instante y sube tu ranking.{" "}
          <span className="text-white">Pickleball · Pádel · Tenis · Fútbol</span>
        </p>

        {/* CTAs */}
        <div
          className="animate-fade-in-up flex flex-wrap gap-4"
          style={{ animationDelay: "0.4s" }}
        >
          <a
            href="#waitlist"
            className="btn-pill bg-white text-[#0a0a0a] px-10 py-3.5"
          >
            Únete Gratis <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#como-funciona"
            className="btn-pill border border-white/30 text-white hover:bg-white hover:text-[#0a0a0a] px-8 py-3.5"
          >
            Mira cómo funciona
          </a>
        </div>

        {/* Social proof */}
        <div className="flex items-center gap-3 mt-8 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
          <div className="flex -space-x-2">
            {["🏓", "🎾", "⚽", "🏸"].map((e, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm">{e}</div>
            ))}
          </div>
          <p className="text-xs text-white/50">
            <span className="text-white font-semibold">+2,000</span> jugadores ya en la plataforma
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
