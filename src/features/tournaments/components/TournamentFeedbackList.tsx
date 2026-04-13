"use client"

import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import type { TournamentFeedback } from "@/features/tournaments/types"

interface Props {
  tournamentId: string
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} className={`size-3.5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-200"}`} />
      ))}
    </div>
  )
}

export function TournamentFeedbackList({ tournamentId }: Props) {
  const [items, setItems] = useState<TournamentFeedback[]>([])
  const [meta, setMeta] = useState<{ average_rating: number; count: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/tournaments/${tournamentId}/feedback`)
      .then(r => r.json() as Promise<{ success: boolean; data: TournamentFeedback[]; meta: { average_rating: number; count: number } }>)
      .then(json => {
        if (json.success) { setItems(json.data ?? []); setMeta(json.meta) }
      })
      .finally(() => setLoading(false))
  }, [tournamentId])

  if (loading) return <p className="text-xs text-zinc-400 py-4">Cargando valoraciones…</p>
  if (!meta || meta.count === 0) return (
    <p className="text-xs text-zinc-400 py-4">Aún no hay valoraciones para este torneo.</p>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Aggregate */}
      <div className="rounded-2xl bg-muted/50 border border-border p-4 flex items-center gap-4">
        <div className="text-center">
          <p className="text-3xl font-black text-foreground">{meta.average_rating}</p>
          <StarRow rating={Math.round(meta.average_rating)} />
        </div>
        <div>
          <p className="text-sm font-black text-foreground">{meta.count} valoración{meta.count !== 1 ? "es" : ""}</p>
          <p className="text-[11px] text-zinc-400">Promedio del torneo</p>
        </div>
      </div>

      {/* Individual */}
      <div className="flex flex-col gap-3">
        {items.map(f => (
          <div key={f.id} className="rounded-xl bg-card border border-border p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black text-foreground">
                {f.profiles?.full_name ?? f.profiles?.username ?? "Jugador"}
              </p>
              <StarRow rating={f.rating} />
            </div>
            {f.comment && <p className="text-xs text-zinc-500 italic">&quot;{f.comment}&quot;</p>}
            <p className="text-[10px] text-zinc-300">
              {new Date(f.created_at).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
