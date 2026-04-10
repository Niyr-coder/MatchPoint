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
        className="lg:hidden p-2 text-zinc-500 hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-zinc-950 border-r border-zinc-800">
          <SheetHeader className="sr-only">
            <SheetTitle>Menú de navegación</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="h-14 px-4 flex items-center border-b border-zinc-800 shrink-0">
              <Link href="/" className="flex items-center gap-2.5 min-w-0">
                <div className="size-6 rounded-md bg-green-600 flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-black tracking-tighter">M</span>
                </div>
                <div className="min-w-0">
                  <p className="text-white font-black text-sm tracking-[-0.03em] uppercase truncate">
                    MATCHPOINT
                  </p>
                  {clubName && (
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-green-600 truncate">
                      {clubName}
                    </p>
                  )}
                </div>
              </Link>
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
