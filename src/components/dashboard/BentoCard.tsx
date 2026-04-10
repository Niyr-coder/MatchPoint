"use client"

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
  default: "bg-card border border-border transition-all duration-200 ease-out hover:border-border/60 hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)] hover:-translate-y-1",
  dark: "bg-foreground transition-all duration-200 ease-out hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] hover:-translate-y-1",
  accent: "bg-success border border-success-border transition-all duration-200 ease-out hover:border-green-300 hover:shadow-[0_6px_16px_rgba(22,163,74,0.08)] hover:-translate-y-1",
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
    <div
      className={cn(
        "animate-fade-in-up relative rounded-2xl overflow-hidden flex flex-col p-6 group",
        "min-h-[160px]",
        VARIANT_CLASSES[variant],
        !href && className,
      )}
      style={{ animationDelay: `${index * 0.07}s` }}
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
            isDark ? "bg-white/10" : isAccent ? "bg-primary/10" : "bg-secondary",
          )}>
            <Icon className={cn(
              "size-4",
              isDark ? "text-white/70" : isAccent ? "text-primary" : "text-muted-foreground",
            )} />
          </div>
        )}

        {/* Header */}
        {(label || title || subtitle) && (
          <div>
            {label && (
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-0.5">
                {label}
              </p>
            )}
            {title && (
              <h2 className={cn(
                "text-base font-black uppercase tracking-tight leading-tight",
                isDark ? "text-white" : "text-foreground",
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
          "absolute top-5 right-5 text-sm font-bold transition-transform duration-200 group-hover:translate-x-1",
          isDark ? "text-white/20" : "text-zinc-300",
        )}>
          →
        </span>
      )}
    </div>
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
