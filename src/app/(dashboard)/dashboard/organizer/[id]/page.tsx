import { authorizeOrRedirect } from "@/features/auth/queries"
import { canOrganize } from "@/features/organizer/permissions"
import { getQuedadaById, getQuedadaParticipants } from "@/features/organizer/queries"
import { QuedadaManagePanel } from "@/features/organizer/components/QuedadaManagePanel"
import { redirect, notFound } from "next/navigation"

export default async function ManageQuedadaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await authorizeOrRedirect()
  const allowed = await canOrganize(ctx)
  if (!allowed) redirect("/dashboard")

  const [quedada, participants] = await Promise.all([
    getQuedadaById(id),
    getQuedadaParticipants(id),
  ])

  if (!quedada) notFound()
  if (quedada.created_by !== ctx.userId) redirect("/dashboard/organizer")

  return <QuedadaManagePanel quedada={quedada} initialParticipants={participants} />
}
