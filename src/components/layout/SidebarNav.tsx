"use client"

import { usePathname } from "next/navigation"
import { SidebarItem } from "@/components/layout/SidebarItem"
import type { NavSection } from "@/types"

interface SidebarNavProps {
  sections: NavSection[]
  onItemClick?: () => void
}

function findActiveHref(sections: NavSection[], pathname: string): string | null {
  let bestHref: string | null = null
  let bestLen = -1

  for (const section of sections) {
    for (const item of section.items) {
      const href = item.href
      const isExact = pathname === href
      const isPrefix = pathname.startsWith(href + "/")
      if ((isExact || isPrefix) && href.length > bestLen) {
        bestHref = href
        bestLen = href.length
      }
    }
  }

  return bestHref
}

export function SidebarNav({ sections, onItemClick }: SidebarNavProps) {
  const pathname = usePathname()
  const activeHref = findActiveHref(sections, pathname)

  return (
    <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
      {sections.map((section, i) => (
        <div key={i} className={i > 0 ? "mt-5" : ""}>
          {section.title && (
            <div className="px-3 pb-1.5">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/50">
                {section.title}
              </p>
            </div>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <SidebarItem
                key={item.href}
                item={item}
                isActive={activeHref === item.href}
                onItemClick={onItemClick}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
