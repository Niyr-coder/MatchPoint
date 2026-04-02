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
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-green-50 text-green-700 font-bold"
          : "text-slate-500 hover:text-[#1e293b] hover:bg-slate-100 font-medium"
      )}
    >
      <Icon className={cn("size-4 shrink-0", isActive ? "text-green-600" : "text-slate-400")} />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}
