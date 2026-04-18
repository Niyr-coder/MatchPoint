import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { authorizeOrRedirect } from '@/features/auth/queries'
import { makeQueryClient } from '@/lib/query/client'
import { prefetchUserProfile } from '@/features/users/prefetch'
import { ProfilePageClient } from '@/features/users/components/ProfilePageClient'

export default async function ProfilePage() {
  const ctx = await authorizeOrRedirect()

  const queryClient = makeQueryClient()
  await prefetchUserProfile(queryClient, ctx.userId)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProfilePageClient userId={ctx.userId} globalRole={ctx.globalRole} />
    </HydrationBoundary>
  )
}
