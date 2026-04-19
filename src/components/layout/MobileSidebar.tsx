"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { SidebarNav } from "@/components/layout/SidebarNav"
import { SidebarUserCard } from "@/components/layout/SidebarUserCard"
import type { NavSection, Profile, AppRole } from "@/types"

interface MobileSidebarProps {
  sections: NavSection[]
  profile: Profile
  currentRole: AppRole
  clubName?: string | null
}

export function MobileSidebar({ sections, profile, currentRole, clubName }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-[#09090b] text-white border-r border-[#27272a]">
          <SheetHeader className="sr-only">
            <SheetTitle>Menú de navegación</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="px-5 py-[18px] flex items-center gap-1.5 border-b border-[#27272a] shrink-0">
              <span className="text-primary text-xl">●</span>
              <span className="font-black text-lg tracking-[-0.02em] text-white">MATCHPOINT</span>
            </div>

            {/* Nav */}
            <SidebarNav sections={sections} onItemClick={() => setOpen(false)} />

            <SidebarUserCard profile={profile} currentRole={currentRole} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
