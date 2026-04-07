"use client"

import { SidebarItem } from "@/components/layout/SidebarItem"
import type { NavSection } from "@/types"

interface SidebarNavProps {
  sections: NavSection[]
  onItemClick?: () => void
}

export function SidebarNav({ sections, onItemClick }: SidebarNavProps) {
  return (
    <nav className="flex-1 overflow-y-auto py-2 px-2">
      {sections.map((section, i) => (
        <div key={i} className={i > 0 ? "mt-4" : ""}>
          {section.title && (
            <div className="px-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
            </div>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <SidebarItem key={item.href} item={item} onItemClick={onItemClick} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
