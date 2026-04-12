import { redirect } from "next/navigation"
import { authorizeOrRedirect } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { SetupShell } from "@/features/clubs/components/SetupShell"
import type { Club } from "@/types"
import type { Court } from "@/features/clubs/types"

export const metadata = { title: "Configura tu club · MATCHPOINT" }

export default async function ClubSetupPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner"] })

  const service = createServiceClient()

  const { data: club } = await service
    .from("clubs")
    .select("*")
    .eq("id", clubId)
    .single()

  if (!club) redirect(`/club/${clubId}/owner`)

  const { data: courts, count: courtsCount } = await service
    .from("courts")
    .select("*", { count: "exact" })
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })

  // Re-entry guard: setup is considered complete once the owner has at least
  // one active court AND has saved an address (signals settings were submitted).
  if ((courtsCount ?? 0) >= 1 && (club as Club).address) {
    redirect(`/club/${clubId}/owner`)
  }

  return (
    <SetupShell
      club={club as Club}
      clubId={clubId}
      existingCourts={(courts ?? []) as Court[]}
    />
  )
}
