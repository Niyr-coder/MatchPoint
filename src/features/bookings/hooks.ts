'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingKeys } from '@/lib/query/keys'

async function fetchUserReservations(userId: string) {
  const res = await fetch(`/api/reservations?user_id=${userId}`)
  if (!res.ok) throw new Error('Error cargando reservas')
  const json = await res.json()
  return json.data ?? []
}

async function fetchReservationInvites(userId: string) {
  const res = await fetch(`/api/reservations/invites?user_id=${userId}`)
  if (res.status === 404) return []  // endpoint doesn't exist yet
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error((json as { error?: string }).error ?? 'Error cargando invitaciones')
  }
  const json = await res.json()
  return json.data ?? []
}

async function cancelReservation(reservationId: string): Promise<void> {
  const res = await fetch(`/api/reservations/${reservationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'cancel' }),
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Error al cancelar')
  }
}

export function useUserReservations(userId: string | undefined | null) {
  return useQuery({
    queryKey: bookingKeys.user(userId ?? ''),
    queryFn: () => fetchUserReservations(userId!),
    enabled: Boolean(userId),
  })
}

export function useReservationInvites(userId: string | undefined | null) {
  return useQuery({
    queryKey: bookingKeys.invites(userId ?? ''),
    queryFn: () => fetchReservationInvites(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}

export function useCancelReservation(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelReservation,
    onMutate: async (reservationId: string) => {
      await queryClient.cancelQueries({ queryKey: bookingKeys.user(userId) })
      const previous = queryClient.getQueryData(bookingKeys.user(userId))
      queryClient.setQueryData(bookingKeys.user(userId), (old: unknown) => {
        if (!Array.isArray(old)) return old
        return old.filter(
          (r: unknown) => (r as { id: string }).id !== reservationId
        )
      })
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(bookingKeys.user(userId), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.user(userId) })
    },
  })
}
