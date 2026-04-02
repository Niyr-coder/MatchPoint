import Link from "next/link"
import { SidebarItem } from "./SidebarItem"
import { SidebarUserCard } from "./SidebarUserCard"
import type { NavSection, Profile, AppRole } from "@/types"

interface SidebarProps {
  sections: NavSection[]
  profile: Profile
  currentRole: AppRole
  clubName?: string | null
}

export function Sidebar({ sections, profile, currentRole, clubName }: SidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 m-3 rounded-2xl bg-white overflow-hidden"
      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-green-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-black tracking-tighter">M</span>
          </div>
          <p className="text-[#1e293b] font-black text-sm tracking-[-0.03em] uppercase">
            MATCHPOINT
          </p>
        </Link>
        {clubName && (
          <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-green-600 truncate pl-[1.875rem]">
            {clubName}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {sections.map((section, i) => (
          <div key={i}>
            {section.title && (
              <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <SidebarItem key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User card */}
      <SidebarUserCard profile={profile} currentRole={currentRole} />
    </aside>
  )
}
