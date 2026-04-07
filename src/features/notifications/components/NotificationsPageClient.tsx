"use client"

import { useState, useTransition } from "react"
import { Bell, Building2, XCircle, Users, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/shared/EmptyState"

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

type NotificationType =
  | "club_request_approved"
  | "club_request_rejected"
  | "team_invite"
  | "system"

export interface NotificationItem {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
}

type FilterValue = "all" | "unread" | "read"

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function getTypeIcon(type: string) {
  switch (type as NotificationType) {
    case "club_request_approved":
      return { Icon: Building2, colorClass: "text-green-600", bgClass: "bg-green-50" }
    case "club_request_rejected":
      return { Icon: XCircle, colorClass: "text-zinc-400", bgClass: "bg-zinc-100" }
    case "team_invite":
      return { Icon: Users, colorClass: "text-zinc-500", bgClass: "bg-[#f5f5f5]" }
    default:
      return { Icon: Bell, colorClass: "text-zinc-400", bgClass: "bg-zinc-100" }
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
  if (diffDays < 30) return `hace ${diffDays} día${diffDays !== 1 ? "s" : ""}`
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// ──────────────────────────────────────────────────────────
// Filter pill sub-component
// ──────────────────────────────────────────────────────────

interface FilterPillProps {
  label: string
  active: boolean
  count?: number
  onClick: () => void
}

function FilterPill({ label, active, count, onClick }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors",
        active
          ? "bg-[#0a0a0a] text-white"
          : "bg-[#f5f5f5] text-[#737373] hover:bg-[#ebebeb] hover:text-[#0a0a0a]"
      )}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            "size-4 flex items-center justify-center rounded-full text-[9px] font-black",
            active ? "bg-white text-[#0a0a0a]" : "bg-[#0a0a0a] text-white"
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  )
}

// ──────────────────────────────────────────────────────────
// Notification row sub-component
// ──────────────────────────────────────────────────────────

interface NotificationRowProps {
  notification: NotificationItem
  onMarkRead: (id: string) => void
  isPending: boolean
}

function NotificationRow({ notification: n, onMarkRead, isPending }: NotificationRowProps) {
  const { Icon, colorClass, bgClass } = getTypeIcon(n.type)

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 border-b border-[#f0f0f0] last:border-0 transition-colors",
        !n.read ? "bg-[#f5f5f5]/30" : "hover:bg-[#fafafa]"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "size-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border border-[#e5e5e5]",
          bgClass
        )}
      >
        <Icon className={cn("size-5", colorClass)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p
            className={cn(
              "text-sm leading-snug",
              n.read ? "font-semibold text-[#404040]" : "font-bold text-[#0a0a0a]"
            )}
          >
            {n.title}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-medium text-zinc-300 whitespace-nowrap">
              {formatRelativeTime(n.created_at)}
            </span>
            {!n.read && (
              <span className="size-2 rounded-full bg-[#f5f5f5]0 shrink-0" />
            )}
          </div>
        </div>
        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{n.body}</p>

        {/* Mark single as read */}
        {!n.read && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onMarkRead(n.id)}
            className="mt-2 text-[10px] font-bold text-[#737373] hover:text-[#16a34a] transition-colors disabled:opacity-40"
          >
            Marcar como leída
          </button>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Main client component
// ──────────────────────────────────────────────────────────

interface NotificationsPageClientProps {
  initialNotifications: NotificationItem[]
}

export function NotificationsPageClient({
  initialNotifications,
}: NotificationsPageClientProps) {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications)
  const [filter, setFilter] = useState<FilterValue>("all")
  const [isPending, startTransition] = useTransition()

  const unreadCount = notifications.filter((n) => !n.read).length
  const readCount = notifications.filter((n) => n.read).length

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read
    if (filter === "read") return n.read
    return true
  })

  async function markSingleRead(id: string) {
    // Optimistic update — immutable pattern
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )

    startTransition(async () => {
      try {
        const res = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [id] }),
        })
        if (!res.ok) {
          // Rollback on failure
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: false } : n))
          )
        }
      } catch {
        // Rollback on network error
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: false } : n))
        )
      }
    })
  }

  async function markAllRead() {
    if (unreadCount === 0) return

    // Optimistic update — immutable pattern
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))

    startTransition(async () => {
      try {
        const res = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        })
        if (!res.ok) {
          // Rollback on failure
          setNotifications(initialNotifications)
        }
      } catch {
        // Rollback on network error
        setNotifications(initialNotifications)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <FilterPill
            label="Todas"
            active={filter === "all"}
            count={notifications.length}
            onClick={() => setFilter("all")}
          />
          <FilterPill
            label="Sin leer"
            active={filter === "unread"}
            count={unreadCount}
            onClick={() => setFilter("unread")}
          />
          <FilterPill
            label="Leídas"
            active={filter === "read"}
            count={readCount}
            onClick={() => setFilter("read")}
          />
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            disabled={isPending}
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs font-bold text-[#737373] hover:text-[#16a34a] transition-colors disabled:opacity-40"
          >
            <CheckCheck className="size-4" />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={
            filter === "unread"
              ? "Sin notificaciones sin leer"
              : filter === "read"
              ? "Sin notificaciones leídas"
              : "Sin notificaciones"
          }
          description={
            filter === "all"
              ? "Cuando recibas notificaciones aparecerán aquí."
              : undefined
          }
        />
      ) : (
        <div className="rounded-2xl border border-[#e5e5e5] bg-white overflow-hidden">
          {filtered.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onMarkRead={markSingleRead}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {/* Total count footer */}
      {notifications.length > 0 && (
        <p className="text-center text-[11px] text-zinc-300 font-medium">
          {notifications.length} notificación{notifications.length !== 1 ? "es" : ""} en total
        </p>
      )}
    </div>
  )
}
