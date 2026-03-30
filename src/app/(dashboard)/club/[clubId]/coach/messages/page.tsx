import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { MessageSquare } from "lucide-react"

export default async function CoachMessagesPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["coach", "owner"] })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="ENTRENADOR · MENSAJES"
        title="Mensajes"
        description="Comunicación con alumnos y el club"
      />
      <EmptyState
        icon={MessageSquare}
        title="Mensajes disponible próximamente"
        description="Aquí podrás comunicarte con tus alumnos, coordinadores y el equipo del club."
      />
    </div>
  )
}
