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
      queryKey: profileKeys.data(userId),
      queryFn: async () => {
        const supabase = createServiceClient()
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        if (error) throw new Error(error.message)
        return data
      },
    }),
  ])
}
