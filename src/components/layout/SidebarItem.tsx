"use client"

import Link from "next/link"
import {
  LayoutDashboard, DollarSign, Building2, Users, Trophy, Shield,
  BarChart3, Settings, MapPin, UserCheck, Calendar, CalendarDays, CreditCard,
  FileBarChart, Sun, Wallet, MessageSquare, FileText, BookOpen,
  User, Award, ShoppingBag, Home, Search, PlusCircle, Link2, CalendarCheck,
  Activity,
} from "lucide-react"
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
      className={[
        "flex items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-[13px] transition-all duration-150 mb-0.5",
        isActive
          ? "bg-primary text-white font-bold"
          : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-white font-medium",
      ].join(" ")}
    >
      <Icon className="size-[15px] shrink-0" />
      <span className="truncate leading-none flex-1">{item.label}</span>
      {item.badge && (
        <span
          className={[
            "text-[9px] font-black px-[7px] py-0.5 rounded-full",
            isActive
              ? "bg-white/25 text-white"
              : "bg-primary text-white",
          ].join(" ")}
        >
          {item.badge}
        </span>
      )}
    </Link>
  )
}
