"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Star } from "lucide-react"

interface Props {
  tournamentId: string
  existingRating?: number
  existingComment?: string
}

export function TournamentFeedbackForm({ tournamentId, existingRating, existingComment }: Props) {
  const router = useRouter()
  const [rating, setRating] = useState(existingRating ?? 0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState(existingComment ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(!!existingRating)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { setError("Selecciona una calificación"); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      })
      const json = await res.json() as { success: boolean; error?: string }
      if (!json.success) { setError(json.error ?? "Error al guardar"); return }
      setSubmitted(true)
      router.refresh()
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Tu valoración</p>
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(n => (
            <Star key={n} className={`size-5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-200"}`} />
          ))}
          <span className="text-sm font-black text-foreground ml-2">{rating}/5</span>
        </div>
        {comment && <p className="text-sm text-zinc-500 italic">"{comment}"</p>}
        <button
          onClick={() => setSubmitted(false)}
          className="text-[11px] font-black text-zinc-400 hover:text-foreground transition-colors w-fit"
        >
          Editar →
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-4">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
        {existingRating ? "Editar valoración" : "Valora este torneo"}
      </p>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={`size-7 transition-colors ${
                  n <= (hovered || rating) ? "fill-amber-400 text-amber-400" : "text-zinc-200"
                }`}
              />
            </button>
          ))}
        </div>
        <p className="text-[11px] text-zinc-400">
          {["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"][hovered || rating] ?? ""}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-wide text-zinc-400">
          Comentario <span className="text-zinc-300 normal-case font-normal">(opcional)</span>
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="¿Qué se puede mejorar? ¿Qué estuvo genial?"
          className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-foreground bg-card resize-none placeholder:text-zinc-400"
        />
        <p className="text-[10px] text-zinc-400 text-right">{comment.length}/500</p>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

      <button
        type="submit"
        disabled={loading || rating === 0}
        className="bg-foreground text-white rounded-full py-2.5 text-sm font-black uppercase tracking-wide hover:bg-foreground/90 transition-colors disabled:opacity-40"
      >
        {loading ? "Guardando…" : existingRating ? "Actualizar valoración" : "Enviar valoración"}
      </button>
    </form>
  )
}
