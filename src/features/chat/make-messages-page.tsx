import { authorizeOrRedirect } from "@/features/auth/queries"
import { ChatView } from "@/components/dashboard/ChatView"
import type { AppRole } from "@/types"

interface MessagesPageConfig {
  role: AppRole
  canBroadcast?: boolean
}

/**
 * Factory que genera páginas de mensajes por rol.
 * Cada página queda en 2-3 líneas usando este helper.
 */
export function makeMessagesPage({ role, canBroadcast = false }: MessagesPageConfig) {
  return async function MessagesPage({
    params,
  }: {
    params: Promise<{ clubId: string }>
  }) {
    const { clubId } = await params
    const ctx = await authorizeOrRedirect({ clubId, requiredRoles: [role] })

    return <ChatView userId={ctx.userId} clubId={clubId} canBroadcast={canBroadcast} />
  }
}
