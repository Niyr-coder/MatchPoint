"use client"

import { useState } from "react"

interface DailyReportFormProps {
  clubId: string
}

type SubmitState = "idle" | "submitting" | "success" | "error"

export function DailyReportForm({ clubId: _clubId }: DailyReportFormProps) {
  const [notes, setNotes] = useState("")
  const [submitState, setSubmitState] = useState<SubmitState>("idle")

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitState("submitting")

    // Simulate async submission — replace with real API call when endpoint exists
    setTimeout(() => {
      setSubmitState("success")
    }, 800)
  }

  if (submitState === "success") {
    return (
      <div className="border border-border rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
        <div className="size-10 rounded-xl bg-green-100 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="size-5 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-black text-zinc-800 uppercase tracking-tight">
          Turno cerrado correctamente
        </p>
        <p className="text-xs text-zinc-400">
          El reporte fue registrado. Puedes cerrar esta página.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border border-border rounded-2xl p-6 flex flex-col gap-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">
          Reporte del turno
        </p>
        <h2 className="text-base font-black uppercase tracking-tight text-foreground">
          Novedades del turno
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Describe los eventos relevantes ocurridos durante el turno.
        </p>
      </div>

      {/* Notes textarea */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="daily-notes"
          className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500"
        >
          Observaciones generales
        </label>
        <textarea
          id="daily-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe los eventos relevantes del día: clientes especiales, problemas con canchas, comentarios del equipo..."
          rows={4}
          className="w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground resize-none transition-colors"
        />
      </div>

      {/* Incidencias section */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
          Incidencias
        </p>
        <div className="border border-border rounded-xl p-4 flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-zinc-400">Sin incidencias registradas</p>
          <p className="text-[10px] text-zinc-300">
            Las incidencias se podrán agregar en próximas versiones
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        {submitState === "error" && (
          <p className="text-xs text-red-500 font-medium">
            Error al cerrar turno. Intenta de nuevo.
          </p>
        )}
        <button
          type="submit"
          disabled={submitState === "submitting"}
          className="text-[11px] font-black uppercase tracking-[0.15em] px-5 py-2.5 rounded-full bg-foreground text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80"
        >
          {submitState === "submitting" ? "Cerrando turno..." : "Cerrar turno"}
        </button>
      </div>
    </form>
  )
}
