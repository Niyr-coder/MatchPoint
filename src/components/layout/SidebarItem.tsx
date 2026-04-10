"use client"

import Link from "next/link"
import {
  LayoutDashboard, DollarSign, Building2, Users, Trophy, Shield,
  BarChart3, Settings, MapPin, UserCheck, Calendar, CalendarDays, CreditCard,
  FileBarChart, Sun, Wallet, MessageSquare, FileText, BookOpen,
  User, Award, ShoppingBag, Home, Search, PlusCircle, Link2, CalendarCheck,
  Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { NavItem } from "@/types"

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, DollarSign, Building2, Users, Trophy, Shield,
  BarChart3, Settings, MapPin, UserCheck, Calendar, CalendarDays, CreditCard,
  FileBarChart, Sun, Wallet, MessageSquare, FileText, BookOpen,
  User, Award, ShoppingBag, Home, Search, PlusCircle, Link2, CalendarCheck,
  Activity,
}

interface SidebarItemProps {
  item: NavItem
  isActive: boolean
  onItemClick?: () => void
}

export function SidebarItem({ item, isActive, onItemClick }: SidebarItemProps) {
  const Icon = ICON_MAP[item.icon] ?? LayoutDashboard

  return (
    <Link
      href={item.href}
      onClick={onItemClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all duration-150",
        isActive
          ? "bg-zinc-800 text-white font-bold"
          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 font-medium"
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-[3px] bg-green-500 rounded-r-full" />
      )}
      <Icon
        className={cn(
          "size-[15px] shrink-0 transition-colors duration-150",
          isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"
        )}
      />
      <span className="truncate leading-none">{item.label}</span>
    </Link>
  )
}
