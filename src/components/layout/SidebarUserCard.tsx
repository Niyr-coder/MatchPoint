"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { ChevronsUpDown, LogOut, Settings, User } from "lucide-react"
import type { Profile, AppRole } from "@/types"

interface SidebarUserCardProps {
  profile: Profile
  currentRole: AppRole
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  owner: "Owner",
  manager: "Manager",
  partner: "Socio",
  coach: "Entrenador",
  employee: "Empleado",
  user: "Jugador",
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

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(" ")
    || profile.full_name
    || "Usuario"

  return (
    <div ref={containerRef} className="relative border-t border-[#27272a] p-3">
      {open && (
        <div className="absolute bottom-full left-3 right-3 mb-1.5 bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden shadow-lg z-50">
          <div className="px-3 py-2.5 border-b border-[#27272a]">
            <p className="text-[11px] font-bold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-[#a1a1aa] truncate">{ROLE_LABELS[currentRole] ?? currentRole}</p>
          </div>
          <div className="p-1">
            <Link
              href="/dashboard/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[12px] font-medium text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors"
            >
              <User className="size-3.5 shrink-0" />
              Mi perfil
            </Link>
            <Link
              href="/dashboard/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[12px] font-medium text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors"
            >
              <Settings className="size-3.5 shrink-0" />
              Configuración
            </Link>
            <div className="my-1 border-t border-[#27272a]" />
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[12px] font-medium text-[#a1a1aa] hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
        className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-[#18181b] transition-colors text-left"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-emerald-700 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-white truncate leading-none">{displayName}</p>
          <p className="text-[10.5px] text-[#a1a1aa] mt-0.5">{ROLE_LABELS[currentRole] ?? currentRole}</p>
        </div>
        <ChevronsUpDown className="size-3.5 text-[#a1a1aa] shrink-0" />
      </button>
    </div>
  )
}
