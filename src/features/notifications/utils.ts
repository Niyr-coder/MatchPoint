import { createServiceClient } from "@/lib/supabase/server"

interface NotificationPayload {
  type: string
  title: string
  body: string
  metadata?: Record<string, unknown>
}

// Keep the old alias so existing callers still compile
type BroadcastPayload = NotificationPayload

/**
 * Inserts a single notification for one user.
 * Fire-and-forget safe — errors are logged but don't throw.
 */
export async function notifyUser(
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from("notifications").insert({
      user_id:  userId,
      type:     payload.type,
      title:    payload.title,
      body:     payload.body,
      metadata: payload.metadata ?? {},
    })
    if (error) console.error("[notifyUser] insert error:", error.message)
  } catch (err) {
    console.error("[notifyUser] unexpected error:", err)
  }
}

/**
 * Notifies all active owners and managers of the club that owns the given court.
 * Resolves court → club_id → club_members (owner|manager) → inserts notifications.
 * Fire-and-forget safe — errors are logged but don't throw.
 */
export async function notifyClubStaff(
  courtId: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    const supabase = createServiceClient()

    // 1. Resolve the club that owns this court
    const { data: court, error: courtErr } = await supabase
      .from("courts")
      .select("club_id")
      .eq("id", courtId)
      .maybeSingle()

    if (courtErr || !court?.club_id) {
      console.error("[notifyClubStaff] could not resolve club for court", courtId, courtErr?.message)
      return
    }

    // 2. Find all active owners and managers of that club
    const { data: members, error: membersErr } = await supabase
      .from("club_members")
      .select("user_id")
      .eq("club_id", court.club_id)
      .eq("is_active", true)
      .in("role", ["owner", "manager"])

    if (membersErr) {
      console.error("[notifyClubStaff] could not fetch members:", membersErr.message)
      return
    }

    if (!members || members.length === 0) return

    // 3. Insert one notification per staff member
    const rows = members.map((m: { user_id: string }) => ({
      user_id:  m.user_id,
      type:     payload.type,
      title:    payload.title,
      body:     payload.body,
      metadata: payload.metadata ?? {},
    }))

    const { error: insertErr } = await supabase.from("notifications").insert(rows)
    if (insertErr) console.error("[notifyClubStaff] insert error:", insertErr.message)
  } catch (err) {
    console.error("[notifyClubStaff] unexpected error:", err)
  }
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
