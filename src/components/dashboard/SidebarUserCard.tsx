"use client"

import { useRef, useState, useEffect } from "react"
import { ChevronsUpDown, LogOut } from "lucide-react"
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
    <div ref={containerRef} className="relative border-t border-slate-100 p-3">
      {open && (
        <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg p-1 z-50">
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
      >
        <Avatar className="size-8 shrink-0">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
          <AvatarFallback className="bg-green-100 text-green-700 text-xs font-bold">
            {initials || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
          <RoleBadge role={currentRole} size="sm" className="mt-0.5" />
        </div>
        <ChevronsUpDown className="size-4 text-slate-400 shrink-0" />
      </button>
    </div>
  )
}
