"use client"

import { motion } from "framer-motion"

interface DashboardHeroProps {
  firstName: string
}

export function DashboardHero({ firstName }: DashboardHeroProps) {
  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="pb-8 mb-8 border-b border-[#e5e5e5]"
    >
      <p className="label-green mb-1">Bienvenido de vuelta</p>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <h1
          className="font-black text-[#0a0a0a] uppercase leading-[0.88] tracking-[-0.03em]"
          style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
        >
          Hola, {firstName}.
        </h1>
        <p className="text-sm font-medium text-zinc-400 capitalize sm:pb-1">{date}</p>
      </div>
    </motion.div>
  )
}
