import 'server-only'
import type { QueryClient } from '@tanstack/react-query'
import { bookingKeys } from '@/lib/query/keys'
import { getAllUserReservations, getReservationInvites } from './queries'

export async function prefetchUserBookings(
  queryClient: QueryClient,
  userId: string
): Promise<void> {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: bookingKeys.user(userId),
      queryFn: () => getAllUserReservations(userId),
    }),
    queryClient.prefetchQuery({
      queryKey: bookingKeys.invites(userId),
      queryFn: () => getReservationInvites(userId),
    }),
  ])
}
