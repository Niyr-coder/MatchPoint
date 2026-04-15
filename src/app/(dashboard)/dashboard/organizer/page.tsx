import { authorizeOrRedirect } from "@/features/auth/queries"
import { canOrganize } from "@/features/organizer/permissions"
import { getOrganizerQuedadas } from "@/features/organizer/queries"
import { OrganizerShell } from "@/features/organizer/components/OrganizerShell"
import { redirect } from "next/navigation"

export default async function OrganizerPage() {
  const ctx = await authorizeOrRedirect()
  const allowed = await canOrganize(ctx)
  if (!allowed) redirect("/dashboard")

  const quedadas = await getOrganizerQuedadas(ctx.userId)

  return <OrganizerShell quedadas={quedadas} />
}
