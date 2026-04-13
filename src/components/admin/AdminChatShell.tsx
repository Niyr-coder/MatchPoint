"use client"

import { useState } from "react"
import { Megaphone, MessageSquare } from "lucide-react"
import { AnnouncementCenter } from "@/components/admin/AnnouncementCenter"
import { ChatView } from "@/components/dashboard/ChatView"

interface Club {
  id: string
  name: string
}

interface AdminChatShellProps {
  userId: string
  clubs: Club[]
}

type Tab = "announcements" | "chat"

const TABS: { id: Tab; label: string; icon: typeof Megaphone }[] = [
  { id: "announcements", label: "Anuncios enviados", icon: Megaphone },
  { id: "chat", label: "Chat personal", icon: MessageSquare },
]

export function AdminChatShell({ userId, clubs }: AdminChatShellProps) {
  const [activeTab, setActiveTab] = useState<Tab>("announcements")
  const [selectedClubId, setSelectedClubId] = useState<string | null>(clubs[0]?.id ?? null)

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-colors
                ${isActive
                  ? "bg-card text-foreground shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
                }`}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === "announcements" && (
        <AnnouncementCenter clubs={clubs} />
      )}
      {activeTab === "chat" && (
        <div className="flex flex-col gap-3">
          {/* Club selector */}
          {clubs.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                Club
              </label>
              <select
                value={selectedClubId ?? ""}
                onChange={(e) => setSelectedClubId(e.target.value || null)}
                className="text-xs font-bold bg-muted border-0 rounded-lg px-3 py-1.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-foreground"
              >
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <ChatView
            userId={userId}
            clubId={selectedClubId}
            canBroadcast={true}
          />
        </div>
      )}
    </div>
  )
}
