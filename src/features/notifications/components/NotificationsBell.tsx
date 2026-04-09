"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Bell, Building2, XCircle, Users, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"

type NotificationType =
  | "club_request_approved"
  | "club_request_rejected"
  | "team_invite"
  | "system"

interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  created_at: string
}

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case "club_request_approved":
      return { Icon: Building2, colorClass: "text-green-600" }
    case "club_request_rejected":
      return { Icon: XCircle, colorClass: "text-zinc-400" }
    case "team_invite":
      return { Icon: Users, colorClass: "text-zinc-500" }
    default:
      return { Icon: Bell, colorClass: "text-zinc-400" }
  }
}

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMinutes = Math.floor(diffMs / 60_000)
  if (diffMinutes < 1) return "ahora"
  if (diffMinutes < 60) return `hace ${diffMinutes} min`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `hace ${diffHours} h`
  const diffDays = Math.floor(diffHours / 24)
  return `hace ${diffDays} día${diffDays !== 1 ? "s" : ""}`
}

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      if (!res.ok) return
      const json = await res.json()
      const items: Notification[] = json.data ?? []
      setNotifications(items)
    } catch {
      // Silently ignore fetch errors — bell degrades gracefully
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  async function markAllRead() {
    try {
      setIsLoading(true)
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      }
    } catch {
      // Silently ignore
    } finally {
      setIsLoading(false)
    }
  }

  async function handleOpen() {
    const next = !isOpen
    setIsOpen(next)
    if (next && unreadCount > 0) {
      await markAllRead()
    }
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={handleOpen}
        aria-label={`Notificaciones${unreadCount > 0 ? `, ${unreadCount} sin leer` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="relative p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors duration-200"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 size-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black leading-none pointer-events-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#e5e5e5] rounded-2xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f0f0]">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#0a0a0a]">
              Notificaciones
            </p>
            {notifications.length > 0 && (
              <button
                onClick={markAllRead}
                disabled={isLoading || unreadCount === 0}
                className="flex items-center gap-1 text-[10px] font-bold text-[#737373] hover:text-[#0a0a0a] transition-colors disabled:opacity-40"
              >
                <CheckCheck className="size-3" />
                Marcar leídas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell className="size-8 text-zinc-200 mb-3" />
                <p className="text-xs font-bold text-zinc-400">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map((n) => {
                const { Icon, colorClass } = getTypeIcon(n.type)
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 border-b border-[#f7f7f7] last:border-0 transition-colors",
                      !n.read ? "bg-[#f5f5f5]/50" : "hover:bg-[#f9f9f9]"
                    )}
                  >
                    <div
                      className={cn(
                        "size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        !n.read ? "bg-white border border-[#e5e5e5]" : "bg-zinc-100"
                      )}
                    >
                      <Icon className={cn("size-4", colorClass)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-[#0a0a0a] leading-snug">{n.title}</p>
                        {!n.read && (
                          <span className="size-2 rounded-full bg-[#f5f5f5]0 shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed line-clamp-2">
                        {n.body}
                      </p>
                      <p className="text-[10px] font-medium text-zinc-300 mt-1">
                        {formatRelativeTime(n.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[#f0f0f0]">
              <a
                href="/dashboard/notifications"
                className="block text-center text-[11px] font-black uppercase tracking-wide text-[#737373] hover:text-[#0a0a0a] transition-colors"
              >
                Ver todas
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
