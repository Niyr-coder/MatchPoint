import { authorizeOrRedirect } from "@/features/auth/queries"
import { canOrganize } from "@/features/organizer/permissions"
import { getUserRoles } from "@/features/memberships/queries"
import { QuedadaWizard } from "@/features/organizer/components/QuedadaWizard"
import { redirect } from "next/navigation"

export default async function NewQuedadaPage() {
  const ctx = await authorizeOrRedirect()
  const allowed = await canOrganize(ctx)
  if (!allowed) redirect("/dashboard")

  const userRoles = await getUserRoles(ctx.userId)
  const clubs = userRoles.map(r => ({ id: r.clubId, name: r.clubName }))

  return <QuedadaWizard clubs={clubs} />
}
