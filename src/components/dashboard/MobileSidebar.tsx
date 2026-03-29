"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { SidebarItem } from "./SidebarItem"
import { SidebarUserCard } from "./SidebarUserCard"
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
        className="lg:hidden p-2 text-zinc-400 hover:text-white transition-colors"
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
            <div className="flex items-center gap-2 px-4 py-4 border-b border-zinc-800">
              <div className="size-7 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-black">M</span>
              </div>
              <div className="min-w-0">
                <p className="text-white font-black text-sm tracking-tight">MATCHPOINT</p>
                {clubName && (
                  <p className="text-zinc-500 text-xs truncate">{clubName}</p>
                )}
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
              {sections.map((section, i) => (
                <div key={i}>
                  {section.title && (
                    <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-green-600">
                      {section.title}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {section.items.map((item) => (
                      <div key={item.href} onClick={() => setOpen(false)}>
                        <SidebarItem item={item} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            <SidebarUserCard profile={profile} currentRole={currentRole} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
