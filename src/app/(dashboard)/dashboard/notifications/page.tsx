import { createClient } from "@/lib/supabase/server"
import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import {
  NotificationsPageClient,
  type NotificationItem,
} from "@/components/dashboard/NotificationsPageClient"

// ──────────────────────────────────────────────────────────
// Metadata
// ──────────────────────────────────────────────────────────

export const metadata = {
  title: "Notificaciones — MATCHPOINT",
}

// ──────────────────────────────────────────────────────────
// Data fetching
// ──────────────────────────────────────────────────────────

async function fetchAllNotifications(userId: string): Promise<{
  data: NotificationItem[] | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: (data ?? []) as NotificationItem[], error: null }
}

// ──────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────

export default async function NotificationsPage() {
  const ctx = await authorizeOrRedirect()

  const { data: notifications, error } = await fetchAllNotifications(ctx.userId)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="ACTIVIDAD"
        title="Notificaciones"
        description="Todas tus notificaciones en un solo lugar"
      />

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-600">
            No se pudieron cargar las notificaciones.
          </p>
          <p className="text-xs text-red-400 mt-0.5">{error}</p>
        </div>
      ) : (
        <NotificationsPageClient initialNotifications={notifications ?? []} />
      )}
    </div>
  )
}
