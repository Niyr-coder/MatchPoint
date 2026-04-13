"use client"

import { useState } from "react"
import { Megaphone } from "lucide-react"

interface BroadcastFormProps {
  clubId: string
  onSuccess: () => void
}

interface BroadcastPayload {
  clubId: string
  title: string
  content: string
}

interface BroadcastResponse {
  error?: string
}

const TITLE_MAX = 200
const CONTENT_MAX = 2000

export function BroadcastForm({ clubId, onSuccess }: BroadcastFormProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const titleTrimmed = title.trim()
  const contentTrimmed = content.trim()
  const isValid = contentTrimmed.length > 0 && contentTrimmed.length <= CONTENT_MAX

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || submitting) return

    setSubmitting(true)
    setError(null)
    setSuccess(false)

    const payload: BroadcastPayload = {
      clubId,
      title: titleTrimmed,
      content: contentTrimmed,
    }

    try {
      const res = await fetch("/api/conversations/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const d = (await res.json()) as BroadcastResponse
        throw new Error(d.error ?? "Error al enviar el anuncio")
      }

      setTitle("")
      setContent("")
      setSuccess(true)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el anuncio")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-4"
      noValidate
    >
      {/* Warning banner */}
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 flex gap-2 items-start">
        <Megaphone className="size-4 text-yellow-600 mt-0.5 shrink-0" />
        <p className="text-xs text-yellow-700 leading-relaxed">
          Este mensaje se enviará a <strong>todos los miembros</strong> del club como anuncio de difusión.
        </p>
      </div>

      {/* Title field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
          Título del anuncio
          <span className="text-zinc-300 ml-1 normal-case tracking-normal font-normal">
            (opcional)
          </span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          placeholder="Ej: Convocatoria torneo interno"
          disabled={submitting}
          className="w-full px-4 py-2.5 bg-muted rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-foreground transition-all disabled:opacity-50"
        />
        {title.length > TITLE_MAX * 0.9 && (
          <p className="text-[10px] text-zinc-400 text-right">
            {title.length}/{TITLE_MAX}
          </p>
        )}
      </div>

      {/* Content field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
          Mensaje
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={CONTENT_MAX}
          rows={5}
          placeholder="Escribe el contenido del anuncio..."
          disabled={submitting}
          className="w-full px-4 py-2.5 bg-muted rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-foreground transition-all resize-none disabled:opacity-50"
        />
        <p className="text-[10px] text-zinc-400 text-right">
          {content.length}/{CONTENT_MAX}
        </p>
      </div>

      {/* Success banner */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          <p className="text-xs text-green-700 font-bold">Anuncio enviado correctamente.</p>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid || submitting}
        className="w-full py-2.5 rounded-xl bg-foreground text-white text-sm font-bold hover:bg-foreground/90 transition-colors disabled:opacity-40"
      >
        {submitting ? "Enviando..." : "Enviar anuncio"}
      </button>
    </form>
  )
}
