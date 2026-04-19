"use client"

import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { SPORTS } from "@/lib/constants"
import { PRIMARY_SPORT } from "@/lib/sports/config"
import { ScrollReveal } from "@/components/shared/ScrollReveal"
import type { SportCategory } from "@/types"

function SportCard({ sport, index, single = false }: { sport: SportCategory; index: number; single?: boolean }) {
  const isPrimary = sport.id === PRIMARY_SPORT

  return (
    <ScrollReveal delay={index * 0.07}>
      <div
        className={[
          "group relative overflow-hidden rounded-2xl bg-black border transition-all duration-500 cursor-pointer",
          single
            ? "h-96 border-primary/60 hover:border-primary w-full"
            : isPrimary
              ? "h-80 border-primary/60 hover:border-primary lg:col-span-2"
              : "h-64 border-white/10 hover:border-white/20",
        ].join(" ")}
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

        {/* Primary badge */}
        {isPrimary && (
          <div className="absolute top-4 left-4 z-20">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-black text-white uppercase tracking-wider">
              Principal
            </span>
          </div>
        )}

        {/* Content */}
        <div className="relative z-20 h-full p-6 flex flex-col justify-end">
          <h3
            className={[
              "font-black text-white uppercase tracking-tight mb-1",
              isPrimary ? "text-2xl" : "text-xl",
            ].join(" ")}
          >
            {sport.name}
          </h3>
          <p className="text-sm text-white/70 font-medium line-clamp-2 mb-3">
            {sport.description}
          </p>
          {sport.stat && (
            <span className="text-xs font-black text-white/60 uppercase tracking-wider mb-3">{sport.stat}</span>
          )}
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </ScrollReveal>
  )
}

export function SportsSection() {
  return (
    <section id="deportes" className="bg-card py-24 border-t border-border">
      <div className="container mx-auto px-6 sm:px-8">
        <ScrollReveal>
          <p className="label-green">Pickleball</p>
          <h2
            className="font-black text-foreground uppercase leading-[0.88] tracking-[-0.03em] mb-12"
            style={{ fontSize: "clamp(2.5rem, 6vw, 6rem)" }}
          >
            PICKLEBALL.<br />ENCUENTRA TU RIVAL.
          </h2>
        </ScrollReveal>

        <div className={SPORTS.length === 1 ? "max-w-3xl" : "grid grid-cols-2 lg:grid-cols-4 gap-4"}>
          {SPORTS.map((sport, i) => (
            <SportCard key={sport.id} sport={sport} index={i} single={SPORTS.length === 1} />
          ))}
        </div>
      </div>
    </section>
  )
}
