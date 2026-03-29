"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

export function CtaSection() {
  return (
    <section id="waitlist" className="relative section-dark py-24 overflow-hidden">
      {/* Radial green glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(22,163,74,0.15),transparent_60%)] pointer-events-none" />

      <div className="relative z-10 container mx-auto px-6 sm:px-8 text-center max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#16a34a] block mb-6 text-center">
            Únete — Acceso Anticipado
          </p>

          <h2
            className="font-black text-white uppercase leading-[0.88] tracking-[-0.03em] mb-6"
            style={{ fontSize: "clamp(3rem, 8vw, 8rem)" }}
          >
            Tu próximo<br />partido empieza<br />aquí.
          </h2>

          <p className="text-white/60 text-lg font-medium mb-10 max-w-xl mx-auto">
            Sé de los primeros en entrar.{" "}
            <span className="text-white font-semibold">Acceso anticipado gratuito</span>{" "}
            para los primeros 500 registrados.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex justify-center"
        >
          <a
            href="/login"
            className="btn-pill bg-white text-[#0a0a0a] px-12 py-4 text-base"
          >
            Únete Gratis <ArrowRight className="w-5 h-5" />
          </a>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="flex items-center justify-center gap-3 mt-10"
        >
          <div className="flex -space-x-2">
            {["⚽", "🎾", "🏓", "🏸"].map((emoji, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full bg-white/10 border-2 border-[#0a0a0a] flex items-center justify-center text-sm"
              >
                {emoji}
              </div>
            ))}
          </div>
          <p className="text-xs text-white/40">
            <span className="text-white font-semibold">+500</span> deportistas ya registrados
          </p>
        </motion.div>
      </div>
    </section>
  )
}
