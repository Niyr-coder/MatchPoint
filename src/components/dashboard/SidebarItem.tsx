"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, DollarSign, Building2, Users, Trophy, Shield,
  BarChart3, Settings, MapPin, UserCheck, Calendar, CreditCard,
  FileBarChart, Sun, Wallet, MessageSquare, FileText, BookOpen,
  User, Award, ShoppingBag, Home, Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { NavItem } from "@/types"

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, DollarSign, Building2, Users, Trophy, Shield,
  BarChart3, Settings, MapPin, UserCheck, Calendar, CreditCard,
  FileBarChart, Sun, Wallet, MessageSquare, FileText, BookOpen,
  User, Award, ShoppingBag, Home, Search,
}

export function SidebarItem({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
  const Icon = ICON_MAP[item.icon] ?? LayoutDashboard

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-zinc-800 text-white border-l-2 border-green-600 pl-[10px]"
          : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}
