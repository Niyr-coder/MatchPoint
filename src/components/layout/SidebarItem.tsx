"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, DollarSign, Building2, Users, Trophy, Shield,
  BarChart3, Settings, MapPin, UserCheck, Calendar, CalendarDays, CreditCard,
  FileBarChart, Sun, Wallet, MessageSquare, FileText, BookOpen,
  User, Award, ShoppingBag, Home, Search, PlusCircle, Link2, CalendarCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { NavItem } from "@/types"

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, DollarSign, Building2, Users, Trophy, Shield,
  BarChart3, Settings, MapPin, UserCheck, Calendar, CalendarDays, CreditCard,
  FileBarChart, Sun, Wallet, MessageSquare, FileText, BookOpen,
  User, Award, ShoppingBag, Home, Search, PlusCircle, Link2, CalendarCheck,
}

interface SidebarItemProps {
  item: NavItem
  onItemClick?: () => void
}

export function SidebarItem({ item, onItemClick }: SidebarItemProps) {
  const pathname = usePathname()
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
  const Icon = ICON_MAP[item.icon] ?? LayoutDashboard

  return (
    <Link
      href={item.href}
      onClick={onItemClick}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors duration-200",
        isActive
          ? "text-white font-semibold"
          : "text-zinc-500 hover:text-white hover:bg-zinc-800/60 font-medium"
      )}
    >
      {isActive && (
        <span className="absolute -left-2 top-1/2 -translate-y-1/2 h-4 w-[3px] bg-green-500 rounded-full" />
      )}
      <Icon className={cn("size-[18px] shrink-0", isActive ? "text-white" : "text-zinc-500")} />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}
