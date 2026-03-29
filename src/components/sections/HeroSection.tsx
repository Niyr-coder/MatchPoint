"use client"

import { motion } from "framer-motion"
import { ArrowRight, ChevronDown } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative w-full min-h-[92vh] flex items-end overflow-hidden bg-black">
      {/* Background Image with subtle zoom */}
      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute inset-0 z-0"
      >
        <div className="absolute inset-0 bg-black/40 z-10" />
        <img
          src="/images/landing/hero.png"
          alt="Sports Complex"
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Overlays */}
      <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(22,163,74,0.15),transparent_70%)] z-10 pointer-events-none" />

      {/* Copy — bottom-left like PICKLEZONE */}
      <div className="relative z-20 container mx-auto px-6 sm:px-8 pb-16 md:pb-24">
        {/* Label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="label-green"
        >
          Tu plataforma deportiva
        </motion.p>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="font-black text-white uppercase leading-[0.88] tracking-[-0.03em] mb-8"
          style={{ fontSize: "clamp(3.5rem, 10vw, 9rem)" }}
        >
          Tu nivel.<br />Tu cancha.
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-white/70 text-lg md:text-xl max-w-md mb-10 font-medium leading-relaxed"
        >
          Fútbol 7, Pádel, Tenis y Pickleball.{" "}
          <span className="text-white">Canchas, rivales y torneos, todo en un solo lugar.</span>
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="flex flex-wrap gap-4"
        >
          <a
            href="#waitlist"
            className="btn-pill bg-white text-[#0a0a0a] px-10 py-3.5"
          >
            Únete Gratis <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#deportes"
            className="btn-pill border border-white/30 text-white hover:bg-white hover:text-[#0a0a0a] px-8 py-3.5"
          >
            Ver deportes
          </a>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce z-10">
        <ChevronDown className="w-6 h-6 text-white/30" />
      </div>
    </section>
  )
}
