"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function joinClub(
  clubId: string,
  clubSlug: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "No autenticado" }
  }

  const service = createServiceClient()

  const { error } = await service
    .from("club_members")
    .insert({ user_id: user.id, club_id: clubId, role: "user", is_active: true })

  // 23505 = unique_violation — user is already a member, treat as success
  if (error && error.code !== "23505") {
    console.error("[joinClub]", error.message)
    return { success: false, error: "Error al unirse al club. Intenta de nuevo." }
  }

  revalidatePath(`/dashboard/clubs/${clubSlug}`)
  return { success: true }
}
