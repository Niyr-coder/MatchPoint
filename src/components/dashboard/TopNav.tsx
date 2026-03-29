"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, ChevronDown } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { NavSection, Profile, AppRole } from "@/types"

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  owner: "Owner",
  partner: "Socio",
  manager: "Gerente",
  employee: "Empleado",
  coach: "Entrenador",
  user: "Jugador",
}

interface TopNavProps {
  navSections: NavSection[]
  profile: Profile
  currentRole: AppRole
  clubName?: string | null
}

export function TopNav({ navSections, profile, currentRole, clubName }: TopNavProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const allItems = navSections.flatMap((s) => s.items)
  const visibleItems = allItems.slice(0, 6)
  const overflowItems = allItems.slice(6)

  const initials = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join("")
  const displayName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.full_name ||
    "Usuario"

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-[#e5e5e5]">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        {/* Logo — matches landing Navbar */}
        <Link href="/" className="flex items-center gap-1.5 font-black text-xl tracking-tight text-[#0a0a0a] shrink-0">
          <div className="size-2.5 rounded-full bg-[#16a34a] shrink-0" />
          MATCHPOINT
        </Link>

        {/* Club name divider */}
        {clubName && (
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <div className="h-4 w-px bg-[#e5e5e5]" />
            <span className="text-[11px] font-bold text-[#16a34a]">
              {clubName}
            </span>
          </div>
        )}

        {/* Desktop nav — landing pill style */}
        <nav className="hidden md:flex items-center gap-1 flex-1 min-w-0">
          {visibleItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-[#0a0a0a] text-white"
                    : "text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f5f5f5]"
                )}
              >
                {item.label}
              </Link>
            )
          })}

          {/* Overflow dropdown */}
          {overflowItems.length > 0 && (
            <div className="relative group">
              <button className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors">
                Más <ChevronDown className="size-3.5" />
              </button>
              <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-[#e5e5e5] rounded-2xl shadow-lg py-1.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                {overflowItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "block px-4 py-2 text-sm font-semibold transition-colors",
                        isActive
                          ? "text-[#0a0a0a] font-bold"
                          : "text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f5f5f5]"
                      )}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Right: role badge + name + avatar + mobile toggle */}
        <div className="flex items-center gap-3 ml-auto shrink-0">
          <span className="hidden sm:block text-[11px] font-bold text-[#16a34a] bg-[#f0fdf4] border border-[#bbf7d0] px-2.5 py-0.5 rounded-full">
            {ROLE_LABELS[currentRole]}
          </span>

          <span className="hidden sm:block text-sm font-semibold text-[#0a0a0a]">
            {displayName}
          </span>

          <Avatar className="size-8 shrink-0">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
            <AvatarFallback className="bg-[#0a0a0a] text-white text-xs font-black">
              {initials || "U"}
            </AvatarFallback>
          </Avatar>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-[#0a0a0a] rounded-lg hover:bg-[#f5f5f5] transition-colors"
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div
        className={`md:hidden bg-white overflow-hidden transition-all duration-300 ${
          mobileOpen ? "max-h-96" : "max-h-0"
        }`}
      >
        <div className="px-4 pb-4 pt-2 space-y-1 border-t border-[#e5e5e5]">
          {allItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-[#0a0a0a] text-white"
                    : "text-[#737373] hover:text-[#0a0a0a]"
                )}
              >
                {item.label}
              </Link>
            )
          })}

          <div className="pt-3 mt-2 border-t border-[#e5e5e5] flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="bg-[#0a0a0a] text-white text-xs font-black">
                {initials || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-[#0a0a0a]">{displayName}</p>
              <p className="text-[11px] font-bold text-[#16a34a]">
                {ROLE_LABELS[currentRole]}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
