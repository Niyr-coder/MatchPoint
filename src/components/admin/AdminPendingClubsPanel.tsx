"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface PendingClub {
  id: string
  name: string
  city: string | null
  province: string | null
  created_at: string
  owner_name: string | null
}

interface AdminPendingClubsPanelProps {
  clubs: PendingClub[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function AdminPendingClubsPanel({ clubs }: AdminPendingClubsPanelProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Track per-club loading and error state independently
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [errorById, setErrorById] = useState<Record<string, string>>({})

  async function handleActivate(club: PendingClub) {
    setLoadingIds((prev) => new Set(prev).add(club.id))
    setErrorById((prev) => {
      const next = { ...prev }
      delete next[club.id]
      return next
    })

    try {
      const res = await fetch("/api/admin/clubs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: club.id, isActive: true }),
      })
      const json: { success: boolean; error?: string | null } = await res.json()

      if (!json.success) {
        setErrorById((prev) => ({
          ...prev,
          [club.id]: json.error ?? "Error desconocido",
        }))
        return
      }

      startTransition(() => router.refresh())
    } catch {
      setErrorById((prev) => ({
        ...prev,
        [club.id]: "Error de conexión. Intenta de nuevo.",
      }))
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(club.id)
        return next
      })
    }
  }

  if (clubs.length === 0) {
    return (
      <p className="text-sm text-zinc-400 text-center py-6">
        No hay clubs inactivos
      </p>
    )
  }

  return (
    <>
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 pb-2 border-b border-border-subtle mb-1">
        <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Club</p>
        <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Ciudad</p>
        <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Owner</p>
        <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 text-right">Creado</p>
        <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 text-right">Acción</p>
      </div>

      <div className="flex flex-col divide-y divide-border-subtle">
        {clubs.map((club) => {
          const isLoading = loadingIds.has(club.id)
          const error = errorById[club.id]

          return (
            <div key={club.id} className="flex flex-col gap-1">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 py-3 items-center">
                {/* Club name + province */}
                <div>
                  <p className="text-sm font-bold text-foreground">{club.name}</p>
                  {club.province && (
                    <p className="text-[10px] text-zinc-400">{club.province}</p>
                  )}
                </div>

                <p className="text-xs text-zinc-500">{club.city ?? "—"}</p>
                <p className="text-xs text-zinc-500">{club.owner_name ?? "—"}</p>
                <p className="text-xs text-zinc-400 text-right">{formatDate(club.created_at)}</p>

                {/* Activate button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleActivate(club)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-success-border text-primary hover:bg-success transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading && <Loader2 className="size-3 animate-spin" />}
                    Activar
                  </button>
                </div>
              </div>

              {/* Per-row error */}
              {error && (
                <p className="text-xs text-red-600 pb-2 px-1">{error}</p>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
