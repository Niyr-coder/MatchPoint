"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, ChevronDown, MessageSquare, ShoppingBag, User, Settings, LogOut, CreditCard } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { ROLE_LABELS } from "@/lib/roles"
import { RoleBadge } from "@/components/shared/RoleBadge"
import type { NavSection, Profile, AppRole } from "@/types"

interface TopNavProps {
  navSections: NavSection[]
  profile: Profile & { username?: string | null }
  currentRole: AppRole
  clubName?: string | null
  dashboardHref: string
}

export function TopNav({ navSections, profile, currentRole, clubName, dashboardHref }: TopNavProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

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

  const profileHref = profile.username ? `/profile/${profile.username}` : "/dashboard/profile"

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [profileOpen])

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-[#e5e5e5]">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href={dashboardHref} className="flex items-center gap-1.5 font-black text-xl tracking-tight text-[#0a0a0a] shrink-0">
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

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1 min-w-0">
          {visibleItems.map((item) => {
            const isParentOfOtherItem = allItems.some(
              (other) => other.href !== item.href && other.href.startsWith(`${item.href}/`)
            )
            const isActive = isParentOfOtherItem
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
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

        {/* Right side */}
        <div className="flex items-center gap-1 ml-auto shrink-0">
          {/* Role badge (desktop) */}
          <span className="hidden sm:block mr-2">
            <RoleBadge role={currentRole} size="sm" />
          </span>

          {/* Chat icon */}
          <Link
            href="/dashboard/chat"
            className="hidden sm:flex p-2 rounded-full text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors"
            aria-label="Chat"
          >
            <MessageSquare className="size-5" />
          </Link>

          {/* Store icon */}
          <Link
            href="/dashboard/shop"
            className="hidden sm:flex p-2 rounded-full text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors"
            aria-label="Tienda"
          >
            <ShoppingBag className="size-5" />
          </Link>

          {/* Profile dropdown */}
          <div ref={profileRef} className="relative hidden sm:block">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-[#f5f5f5] transition-colors"
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              <Avatar className="size-7 shrink-0">
                <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
                <AvatarFallback className="bg-[#0a0a0a] text-white text-xs font-black">
                  {initials || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold text-[#0a0a0a] max-w-[100px] truncate">
                {displayName}
              </span>
              <ChevronDown className={cn("size-3.5 text-[#737373] transition-transform", profileOpen && "rotate-180")} />
            </button>

            {/* Dropdown menu */}
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-[#e5e5e5] rounded-2xl shadow-lg py-1.5 z-50">
                <div className="px-4 py-2 border-b border-[#f0f0f0] mb-1">
                  <p className="text-xs font-black text-[#0a0a0a] truncate">{displayName}</p>
                  <p className="mt-0.5">
                    <RoleBadge role={currentRole} size="sm" />
                  </p>
                </div>
                <Link
                  href={profileHref}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors"
                >
                  <User className="size-4" />
                  Mi Perfil
                </Link>
                <Link
                  href="/dashboard/account"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors"
                >
                  <CreditCard className="size-4" />
                  Cuenta
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors"
                >
                  <Settings className="size-4" />
                  Configuración
                </Link>
                <div className="border-t border-[#f0f0f0] mt-1 pt-1">
                  <form action="/auth/signout" method="POST">
                    <button
                      type="submit"
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="size-4" />
                      Cerrar Sesión
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

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
          mobileOpen ? "max-h-[500px]" : "max-h-0"
        }`}
      >
        <div className="px-4 pb-4 pt-2 space-y-1 border-t border-[#e5e5e5]">
          {/* Nav items */}
          {allItems.map((item) => {
            const isParentOfOtherItem = allItems.some(
              (other) => other.href !== item.href && other.href.startsWith(`${item.href}/`)
            )
            const isActive = isParentOfOtherItem
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
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

          {/* Chat & Tienda */}
          <Link href="/dashboard/chat" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#737373] hover:text-[#0a0a0a]">
            <MessageSquare className="size-4" /> Chat
          </Link>
          <Link href="/dashboard/shop" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#737373] hover:text-[#0a0a0a]">
            <ShoppingBag className="size-4" /> Tienda
          </Link>

          {/* Profile section */}
          <div className="pt-3 mt-2 border-t border-[#e5e5e5] space-y-1">
            <div className="flex items-center gap-3 px-4 py-2">
              <Avatar className="size-8">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="bg-[#0a0a0a] text-white text-xs font-black">
                  {initials || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-[#0a0a0a]">{displayName}</p>
                <RoleBadge role={currentRole} size="sm" className="mt-0.5" />
              </div>
            </div>
            <Link href={profileHref} onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-semibold text-[#737373] hover:text-[#0a0a0a]">
              <User className="size-4" /> Mi Perfil
            </Link>
            <Link href="/dashboard/account" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-semibold text-[#737373] hover:text-[#0a0a0a]">
              <CreditCard className="size-4" /> Cuenta
            </Link>
            <Link href="/dashboard/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-semibold text-[#737373] hover:text-[#0a0a0a]">
              <Settings className="size-4" /> Configuración
            </Link>
            <form action="/auth/signout" method="POST">
              <button type="submit" className="flex items-center gap-2.5 w-full px-4 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                <LogOut className="size-4" /> Cerrar Sesión
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  )
}
