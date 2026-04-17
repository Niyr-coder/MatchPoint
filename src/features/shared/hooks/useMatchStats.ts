'use client'

import { useState, useCallback, useEffect } from "react"
import type { MatchStats } from "@/features/tournaments/types"

interface UseMatchStatsResult {
  stats: MatchStats[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useMatchStats(tournamentId: string): UseMatchStatsResult {
  const [stats, setStats] = useState<MatchStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/stats`)
      const json = await response.json() as { success: boolean; data: MatchStats[] | null; error: string | null }

      if (!response.ok || !json.success) {
        setError(json.error ?? "Error al cargar estadísticas")
        setStats([])
      } else {
        setStats(json.data ?? [])
      }
    } catch {
      setError("Error de red al cargar estadísticas")
      setStats([])
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, error, refetch: fetchStats }
}
