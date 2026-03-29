"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  Calendar, Search, Trophy, Building2, Users, DollarSign,
  BarChart3, MapPin, BookOpen, Star, Wallet, Activity, Plus,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ICON_MAP: Record<string, LucideIcon> = {
  Calendar, Search, Trophy, Building2, Users, DollarSign,
  BarChart3, MapPin, BookOpen, Star, Wallet, Activity, Plus,
}

const VARIANT_CLASSES: Record<string, string> = {
  default: "bg-white border border-[#e5e5e5]",
  dark: "bg-[#0a0a0a]",
  accent: "bg-[#f0fdf4] border border-[#bbf7d0]",
}

interface BentoCardProps {
  variant?: "default" | "dark" | "accent"
  label?: string
  title?: string
  subtitle?: string
  href?: string
  icon?: string
  children?: React.ReactNode
  className?: string
  index?: number
}

export function BentoCard({
  variant = "default",
  label,
  title,
  subtitle,
  href,
  icon,
  children,
  className,
  index = 0,
}: BentoCardProps) {
  const Icon = icon ? (ICON_MAP[icon] ?? null) : null
  const isDark = variant === "dark"
  const isAccent = variant === "accent"

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative rounded-2xl overflow-hidden flex flex-col p-6",
        "min-h-[160px]",
        VARIANT_CLASSES[variant],
        !href && className,
      )}
    >
      {/* Subtle radial glow for dark cards */}
      {isDark && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_25%,rgba(22,163,74,0.1),transparent_60%)] pointer-events-none" />
      )}

      <div className="relative z-10 flex flex-col flex-1 gap-4">
        {/* Icon */}
        {Icon && (
          <div className={cn(
            "size-9 rounded-xl flex items-center justify-center shrink-0",
            isDark ? "bg-white/10" : isAccent ? "bg-[#16a34a]/10" : "bg-zinc-100",
          )}>
            <Icon className={cn(
              "size-4",
              isDark ? "text-white/70" : isAccent ? "text-[#16a34a]" : "text-zinc-500",
            )} />
          </div>
        )}

        {/* Header */}
        {(label || title || subtitle) && (
          <div>
            {label && (
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#16a34a] mb-0.5">
                {label}
              </p>
            )}
            {title && (
              <h2 className={cn(
                "text-base font-black uppercase tracking-tight leading-tight",
                isDark ? "text-white" : "text-[#0a0a0a]",
              )}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p className={cn(
                "text-xs font-medium mt-1 leading-relaxed",
                isDark ? "text-white/50" : "text-zinc-400",
              )}>
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Custom content */}
        {children && <div className="flex-1 flex flex-col">{children}</div>}
      </div>

      {/* Arrow hint for clickable cards */}
      {href && (
        <span className={cn(
          "absolute top-5 right-5 text-sm font-bold",
          isDark ? "text-white/20" : "text-zinc-300",
        )}>
          →
        </span>
      )}
    </motion.div>
  )

  if (href) {
    return (
      <Link href={href} className={cn("block", className)}>
        {inner}
      </Link>
    )
  }

  return inner
}
