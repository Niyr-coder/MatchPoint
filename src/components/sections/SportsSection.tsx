"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { SPORTS } from "@/lib/constants"
import type { SportCategory } from "@/types"

function SportCard({ sport, index }: { sport: SportCategory; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className="group relative h-64 overflow-hidden rounded-2xl bg-black border border-white/10 hover:border-white/20 transition-all duration-500 cursor-pointer"
    >
      {/* Background Image */}
      <img 
        src={sport.image} 
        alt={sport.name} 
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-80"
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
    </motion.div>
  )
}

export function SportsSection() {
  return (
    <section id="deportes" className="bg-white py-24 border-t border-[#e5e5e5]">
      <div className="container mx-auto px-6 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <p className="label-green">Deportes</p>
          <h2
            className="font-black text-[#0a0a0a] uppercase leading-[0.88] tracking-[-0.03em] mb-12"
            style={{ fontSize: "clamp(2.5rem, 6vw, 6rem)" }}
          >
            Un deporte.<br />Mil partidos.
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SPORTS.map((sport, i) => (
            <SportCard key={sport.id} sport={sport} index={i} />
          ))}
        </div>

        {/* Coming soon */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-8 flex items-center gap-3"
        >
          <span className="text-xs text-[#737373]">Próximamente:</span>
          <span className="text-xs font-medium text-[#737373]">
            Natación · Baloncesto · Béisbol · Crossfit
          </span>
        </motion.div>
      </div>
    </section>
  )
}
