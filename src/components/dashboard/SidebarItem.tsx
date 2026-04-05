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

export function SidebarItem({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
  const Icon = ICON_MAP[item.icon] ?? LayoutDashboard

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-xl py-2 text-sm transition-colors",
        isActive
          ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 font-bold border-l-2 border-green-500 pl-[10px] pr-3"
          : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-medium px-3"
      )}
    >
      <Icon className={cn("size-4 shrink-0", isActive ? "text-green-600" : "text-slate-400")} />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}
