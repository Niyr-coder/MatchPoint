export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { authorize } from "@/features/auth/queries"
import { getUserRoles } from "@/features/memberships/queries"
import { RoleContextProvider } from "@/features/memberships/hooks"
import type { AuthContext } from "@/types"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const result = await authorize()

  if (!result.ok) {
    redirect("/login")
  }

  const ctx = (result as { ok: true; context: AuthContext }).context

  if (!ctx.profile.onboarding_completed) {
    redirect("/onboarding")
  }

  const availableRoles = await getUserRoles(ctx.userId)

  return (
    <RoleContextProvider availableRoles={availableRoles}>
      {children}
    </RoleContextProvider>
  )
}
