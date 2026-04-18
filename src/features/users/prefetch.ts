import 'server-only'
import type { QueryClient } from '@tanstack/react-query'
import { profileKeys } from '@/lib/query/keys'
import { getPlayerStats } from './queries'
import { getUserRoles } from '@/features/memberships/queries'
import { createServiceClient } from '@/lib/supabase/server'

export async function prefetchUserProfile(
  queryClient: QueryClient,
  userId: string
): Promise<void> {
  const supabase = createServiceClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: profileKeys.stats(userId),
      queryFn: () => getPlayerStats(userId),
    }),
    queryClient.prefetchQuery({
      queryKey: profileKeys.roles(userId),
      queryFn: () => getUserRoles(userId),
    }),
    queryClient.prefetchQuery({
      queryKey: ['profile', 'data', userId],
      queryFn: async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        return data
      },
    }),
  ])
}
