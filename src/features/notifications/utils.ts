import { createServiceClient } from "@/lib/supabase/server"

interface BroadcastPayload {
  type: string
  title: string
  body: string
  metadata?: Record<string, unknown>
}

/**
 * Inserts one notification row per active user.
 * Uses the service role client so RLS doesn't block the fan-out insert.
 * Fire-and-forget safe — errors are logged but don't throw.
 */
export async function broadcastNotificationToAll(
  payload: BroadcastPayload
): Promise<void> {
  try {
    const supabase = createServiceClient()

    // Fetch all profile IDs (one per user)
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id")

    if (profilesError) {
      console.error("[broadcastNotification] fetch profiles error:", profilesError.message)
      return
    }

    if (!profiles || profiles.length === 0) return

    const rows = profiles.map((p: { id: string }) => ({
      user_id: p.id,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      metadata: payload.metadata ?? {},
    }))

    // Batch insert — Supabase handles up to ~1000 rows per call
    const chunkSize = 500
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize)
      const { error } = await supabase.from("notifications").insert(chunk)
      if (error) {
        console.error("[broadcastNotification] insert error:", error.message)
      }
    }
  } catch (err) {
    console.error("[broadcastNotification] unexpected error:", err)
  }
}
