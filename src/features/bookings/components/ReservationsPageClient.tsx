'use client'

import { useUserReservations, useReservationInvites } from '../hooks'
import { ReservationsList } from './ReservationsList'

interface Props {
  userId: string
}

export function ReservationsPageClient({ userId }: Props) {
  const { data: reservations = [] } = useUserReservations(userId || undefined)
  const { data: invites = [] } = useReservationInvites(userId || undefined)

  return <ReservationsList reservations={reservations} invites={invites} />
}
