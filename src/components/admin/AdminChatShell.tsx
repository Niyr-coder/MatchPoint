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
        <ChatView userId={userId} />
      )}
    </div>
  )
}
