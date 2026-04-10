"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { ChevronsUpDown, LogOut, Settings, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RoleBadge } from "@/components/shared/RoleBadge"
import type { Profile, AppRole } from "@/types"

interface SidebarUserCardProps {
  profile: Profile
  currentRole: AppRole
}

export function SidebarUserCard({ profile, currentRole }: SidebarUserCardProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const initials = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join("")

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(" ")
    || profile.full_name
    || "Usuario"

  return (
    <div ref={containerRef} className="relative border-t border-zinc-800/80 p-2.5">
      {open && (
        <div className="absolute bottom-full left-2.5 right-2.5 mb-1.5 bg-zinc-900 border border-zinc-700/80 rounded-xl overflow-hidden shadow-xl z-50">
          {/* User info header in dropdown */}
          <div className="px-3 py-2.5 border-b border-zinc-800">
            <p className="text-[11px] font-black text-white truncate">{displayName}</p>
            {profile.username && (
              <p className="text-[10px] text-zinc-500 truncate">@{profile.username}</p>
            )}
          </div>
          {/* Actions */}
          <div className="p-1">
            <Link
              href="/dashboard/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[12px] font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors duration-100"
            >
              <User className="size-3.5 shrink-0" />
              Mi perfil
            </Link>
            <Link
              href="/dashboard/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[12px] font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors duration-100"
            >
              <Settings className="size-3.5 shrink-0" />
              Configuración
            </Link>
            <div className="my-1 border-t border-zinc-800" />
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[12px] font-medium text-zinc-500 hover:text-red-400 hover:bg-red-950/40 transition-colors duration-100"
              >
                <LogOut className="size-3.5 shrink-0" />
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors duration-150 text-left"
      >
        <Avatar className="size-7 shrink-0">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
          <AvatarFallback className="bg-zinc-800 text-zinc-300 text-[10px] font-black">
            {initials || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-white truncate leading-none">{displayName}</p>
          <RoleBadge role={currentRole} size="sm" className="mt-1" />
        </div>
        <ChevronsUpDown className="size-3.5 text-zinc-600 shrink-0" />
      </button>
    </div>
  )
}
