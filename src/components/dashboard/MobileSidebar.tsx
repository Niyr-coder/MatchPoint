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
        className="lg:hidden p-2 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-white border-r border-slate-100">
          <SheetHeader className="sr-only">
            <SheetTitle>Menú de navegación</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-100">
              <div className="size-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-black tracking-tighter">M</span>
              </div>
              <div className="min-w-0">
                <p className="text-[#1e293b] font-black text-sm tracking-[-0.03em] uppercase truncate">
                  MATCHPOINT
                </p>
                {clubName && (
                  <p className="text-green-600 text-[10px] font-black uppercase tracking-[0.18em] truncate">
                    {clubName}
                  </p>
                )}
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
              {sections.map((section, i) => (
                <div key={i}>
                  {section.title && (
                    <div className="flex items-center gap-2 px-3 py-1.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {section.title}
                      </p>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>
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
