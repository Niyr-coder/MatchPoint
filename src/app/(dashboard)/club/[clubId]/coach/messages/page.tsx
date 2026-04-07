import { authorizeOrRedirect } from "@/features/auth/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { ChatView } from "@/components/dashboard/ChatView"

export default async function CoachMessagesPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["coach"] })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader label="Entrenador · Mensajes" title="Mensajes" />
      <ChatView userId={ctx.userId} />
    </div>
  )
}
