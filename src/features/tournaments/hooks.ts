'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tournamentKeys } from '@/lib/query/keys'
import type { Tournament } from './types'
import type { ApiResponse } from '@/types'

async function fetchOpenTournaments(): Promise<Tournament[]> {
  const res = await fetch('/api/tournaments?limit=20')
  if (!res.ok) throw new Error('Error cargando torneos')
  const json = (await res.json()) as ApiResponse<Tournament[]>
  return json.data ?? []
}

async function fetchMyTournaments(userId: string): Promise<Tournament[]> {
  const res = await fetch(`/api/tournaments?created_by=${userId}&limit=20`)
  if (!res.ok) throw new Error('Error cargando mis torneos')
  const json = (await res.json()) as ApiResponse<Tournament[]>
  return json.data ?? []
}

async function joinTournament(tournamentId: string): Promise<void> {
  const res = await fetch(`/api/tournaments/${tournamentId}/join`, {
    method: 'POST',
  })
  if (!res.ok) {
    const json = (await res.json()) as ApiResponse<null>
    throw new Error(json.error ?? 'Error al unirse')
  }
}

export function useOpenTournaments() {
  return useQuery({
    queryKey: tournamentKeys.open(),
    queryFn: fetchOpenTournaments,
  })
}

export function useMyTournaments(userId: string | undefined | null) {
  const safeId = userId ?? ''
  return useQuery({
    queryKey: tournamentKeys.mine(safeId),
    queryFn: () => fetchMyTournaments(safeId),
    enabled: Boolean(userId),
  })
}

export function useJoinTournament() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: joinTournament,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all() })
    },
  })
}
