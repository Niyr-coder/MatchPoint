import type { QueryClient } from '@tanstack/react-query'
import { tournamentKeys } from '@/lib/query/keys'
import { getOpenTournaments, getCreatedTournaments } from './queries'

export async function prefetchTournamentsList(
  queryClient: QueryClient,
  userId: string
): Promise<void> {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: tournamentKeys.open(),
      queryFn: getOpenTournaments,
    }),
    queryClient.prefetchQuery({
      queryKey: tournamentKeys.mine(userId),
      queryFn: () => getCreatedTournaments(userId),
    }),
  ])
}
