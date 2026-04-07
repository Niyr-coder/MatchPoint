import { authorizeOrRedirect } from "@/features/auth/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { ChatView } from "@/components/dashboard/ChatView"

export default async function ManagerMessagesPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["manager"] })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader label="Manager · Mensajes" title="Mensajes del Club" />
      <ChatView userId={ctx.userId} />
    </div>
  )
}
