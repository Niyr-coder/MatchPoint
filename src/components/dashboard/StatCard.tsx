"use client"

import {
  LayoutDashboard, DollarSign, Building2, Users, Trophy, Shield,
  BarChart3, Settings, MapPin, UserCheck, Calendar, CreditCard,
  FileBarChart, Sun, Wallet, MessageSquare, FileText, BookOpen,
  User, Award, ShoppingBag, Home, Search, Star, type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, DollarSign, Building2, Users, Trophy, Shield,
  BarChart3, Settings, MapPin, UserCheck, Calendar, CreditCard,
  FileBarChart, Sun, Wallet, MessageSquare, FileText, BookOpen,
  User, Award, ShoppingBag, Home, Search, Star,
}

interface StatCardProps {
  label: string
  value: string | number
  suffix?: string
  /** Icon name string, e.g. "Calendar", "DollarSign" */
  icon?: string
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  accent?: boolean
  index?: number
  className?: string
}

export function StatCard({
  label,
  value,
  suffix,
  icon,
  trend,
  trendValue,
  accent = false,
  index = 0,
  className,
}: StatCardProps) {
  const Icon = icon ? (ICON_MAP[icon] ?? null) : null

  return (
    <div
      className={cn(
        "animate-fade-in-up relative bg-white border rounded-2xl p-5 overflow-hidden cursor-default",
        accent ? "border-[#0a0a0a]" : "border-zinc-200",
        className
      )}
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      {accent && (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-green-500" />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 truncate">
            {label}
          </p>
          <p
            className={cn(
              "mt-2 font-black text-[#0a0a0a] leading-none tracking-tight",
              accent ? "text-4xl" : "text-3xl"
            )}
          >
            {value}
            {suffix && (
              <span className="text-base font-bold text-zinc-400 ml-1.5">{suffix}</span>
            )}
          </p>
          {trendValue && (
            <p
              className={cn(
                "mt-2 text-[10px] font-black uppercase tracking-wide",
                trend === "up" && "text-green-600",
                trend === "down" && "text-red-500",
                trend === "neutral" && "text-zinc-400"
              )}
            >
              {trendValue}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "size-10 rounded-lg flex items-center justify-center shrink-0",
              accent ? "bg-[#0a0a0a]" : "bg-zinc-100"
            )}
          >
            <Icon className={cn("size-5", accent ? "text-white" : "text-zinc-500")} />
          </div>
        )}
      </div>
    </div>
  )
}
