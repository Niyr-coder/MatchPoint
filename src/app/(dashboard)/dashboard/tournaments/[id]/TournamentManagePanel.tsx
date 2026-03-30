"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Settings, Play, CheckCircle, XCircle } from "lucide-react"

interface StatusAction {
  from: string
  action: string
  to: string
  icon: React.ElementType
  color: string
  description: string
}

const STATUS_FLOW: StatusAction[] = [
  { from: "draft",       action: "Publicar torneo",   to: "open",        icon: Play,        color: "bg-green-600 hover:bg-green-700 text-white",   description: "Los jugadores podrán inscribirse" },
  { from: "open",        action: "Iniciar torneo",     to: "in_progress", icon: Play,        color: "bg-[#1a56db] hover:bg-[#1648c0] text-white",  description: "Cierra inscripciones e inicia la competencia" },
  { from: "in_progress", action: "Finalizar torneo",   to: "completed",   icon: CheckCircle, color: "bg-zinc-800 hover:bg-zinc-900 text-white",     description: "Marca el torneo como completado" },
]

const CANCEL_ALLOWED = ["draft", "open", "in_progress"]

export function TournamentManagePanel({
  tournamentId,
  currentStatus,
  modality,
  onRefresh,
}: {
  tournamentId: string
  currentStatus: string
  modality?: string | null
  onRefresh?: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const nextAction = STATUS_FLOW.find(s => s.from === currentStatus)

  async function updateStatus(newStatus: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) { setError(data.error ?? "Error al actualizar"); return }
      onRefresh ? onRefresh() : router.refresh()
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
      setConfirmCancel(false)
    }
  }

  return (
    <div className="bg-white border-2 border-dashed border-[#1a56db]/30 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Settings className="size-4 text-[#1a56db]" />
        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-[#1a56db]">Panel de gestión</p>
        <span className="ml-auto text-[10px] text-zinc-400">Solo visible para ti</span>
      </div>

      <div className="bg-zinc-50 rounded-xl p-3">
        <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Estado actual</p>
        <p className="text-sm font-black text-zinc-800 mt-0.5">
          {currentStatus === "draft" ? "Borrador — No visible para otros" :
           currentStatus === "open" ? "Publicado — Inscripciones abiertas" :
           currentStatus === "in_progress" ? "En curso" :
           currentStatus === "completed" ? "Finalizado" : currentStatus}
        </p>
        {modality && (
          <p className="text-[10px] text-zinc-400 mt-1">Modalidad: <span className="font-bold text-zinc-600">{modality}</span></p>
        )}
      </div>

      {nextAction && (() => { const Icon = nextAction.icon; return (
        <>
          <button onClick={() => updateStatus(nextAction.to)} disabled={loading}
            className={`w-full py-3 rounded-xl text-sm font-black uppercase tracking-[0.1em] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${nextAction.color}`}>
            <Icon className="size-4" />
            {loading ? "Actualizando..." : nextAction.action}
          </button>
          <p className="text-xs text-zinc-400 text-center -mt-2">{nextAction.description}</p>
        </>
      )})()}

      {CANCEL_ALLOWED.includes(currentStatus) && (
        <div className="border-t border-[#f0f0f0] pt-3">
          {!confirmCancel ? (
            <button onClick={() => setConfirmCancel(true)}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-600 transition-colors font-bold">
              <XCircle className="size-3.5" /> Cancelar torneo
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-zinc-500 flex-1">¿Seguro? No se puede deshacer.</p>
              <button onClick={() => updateStatus("cancelled")} disabled={loading}
                className="text-xs font-black text-red-600 border border-red-200 rounded-lg px-3 py-1.5">Confirmar</button>
              <button onClick={() => setConfirmCancel(false)}
                className="text-xs font-bold text-zinc-400 px-3 py-1.5">No</button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
    </div>
  )
}
