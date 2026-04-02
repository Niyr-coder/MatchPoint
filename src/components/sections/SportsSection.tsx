"use client"

import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { SPORTS } from "@/lib/constants"
import type { SportCategory } from "@/types"

function SportCard({ sport, index }: { sport: SportCategory; index: number }) {
  return (
    <div
      className="animate-fade-in-up group relative h-64 overflow-hidden rounded-2xl bg-black border border-white/10 hover:border-white/20 transition-all duration-500 cursor-pointer"
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      {/* Background Image */}
      <Image
        src={sport.image}
        alt={sport.name}
        fill
        className="object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-80"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />

      {/* Content */}
      <div className="relative z-20 h-full p-6 flex flex-col justify-end">
        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">
          {sport.name}
        </h3>
        <p className="text-sm text-white/70 font-medium line-clamp-2 mb-3">
          {sport.description}
        </p>
        <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  )
}

export function SportsSection() {
  return (
    <section id="deportes" className="bg-white py-24 border-t border-[#e5e5e5]">
      <div className="container mx-auto px-6 sm:px-8">
        <div className="animate-fade-in-up-16">
          <p className="label-green">Deportes</p>
          <h2
            className="font-black text-[#0a0a0a] uppercase leading-[0.88] tracking-[-0.03em] mb-12"
            style={{ fontSize: "clamp(2.5rem, 6vw, 6rem)" }}
          >
            Un deporte.<br />Mil partidos.
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SPORTS.map((sport, i) => (
            <SportCard key={sport.id} sport={sport} index={i} />
          ))}
        </div>

        {/* Coming soon */}
        <div
          className="animate-fade-in mt-8 flex items-center gap-3"
          style={{ animationDelay: "0.3s" }}
        >
          <span className="text-xs text-[#737373]">Próximamente:</span>
          <span className="text-xs font-medium text-[#737373]">
            Natación · Baloncesto · Béisbol · Crossfit
          </span>
        </div>
      </div>
    </section>
  )
}
