import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { MessageSquare } from "lucide-react"

export default async function ManagerMessagesPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["manager", "owner"] })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="MANAGER · MENSAJES"
        title="Mensajes del Club"
        description="Comunicaciones internas del club"
      />
      <EmptyState
        icon={MessageSquare}
        title="Mensajes disponible próximamente"
        description="Aquí podrás gestionar las comunicaciones con el equipo, socios y entrenadores del club."
      />
    </div>
  )
}
