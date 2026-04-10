"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Settings, Play, CheckCircle, XCircle, Pencil } from "lucide-react"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface StatusAction {
  from: string
  action: string
  to: string
  icon: React.ElementType
  color: string
  description: string
}

const STATUS_FLOW: StatusAction[] = [
  { from: "draft",       action: "Publicar torneo",   to: "open",        icon: Play,        color: "bg-green-600 hover:bg-green-700 text-white",  description: "Los jugadores podrán inscribirse" },
  { from: "open",        action: "Iniciar torneo",     to: "in_progress", icon: Play,        color: "bg-foreground hover:bg-foreground/90 text-white", description: "Cierra inscripciones e inicia la competencia" },
  { from: "in_progress", action: "Finalizar torneo",   to: "completed",   icon: CheckCircle, color: "bg-zinc-800 hover:bg-zinc-900 text-white",    description: "Marca el torneo como completado" },
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

  // Edit sheet
  const [editOpen, setEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    name: "", description: "", start_date: "", start_time: "",
    end_date: "", entry_fee: 0, max_participants: 16, modality: "",
  })

  async function openEdit() {
    setEditError(null)
    const res = await fetch(`/api/tournaments/${tournamentId}`)
    const json = await res.json() as { success: boolean; data?: Record<string, unknown> }
    if (json.success && json.data) {
      const t = json.data
      setEditForm({
        name: (t.name as string) ?? "",
        description: (t.description as string) ?? "",
        start_date: (t.start_date as string) ?? "",
        start_time: (t.start_time as string) ?? "",
        end_date: (t.end_date as string) ?? "",
        entry_fee: (t.entry_fee as number) ?? 0,
        max_participants: (t.max_participants as number) ?? 16,
        modality: (t.modality as string) ?? "",
      })
    }
    setEditOpen(true)
  }

  async function saveEdit() {
    setEditLoading(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      const json = await res.json() as { success: boolean; error?: string }
      if (!json.success) { setEditError(json.error ?? "Error al guardar"); return }
      setEditOpen(false)
      onRefresh ? onRefresh() : router.refresh()
    } catch {
      setEditError("Error de conexión")
    } finally {
      setEditLoading(false)
    }
  }

  // Cancel confirm dialog
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  // Force-complete confirm dialog (for 409 with incomplete matches)
  const [forceCompleteOpen, setForceCompleteOpen] = useState(false)
  const [forceCompleteLoading, setForceCompleteLoading] = useState(false)
  const [incompleteCount, setIncompleteCount] = useState(0)

  const nextAction = STATUS_FLOW.find(s => s.from === currentStatus)

  async function updateStatus(newStatus: string, force = false) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...(force ? { force: true } : {}) }),
      })
      const data = await res.json() as {
        success: boolean
        error?: string
        requiresConfirmation?: boolean
        incompleteCount?: number
      }

      if (res.status === 409 && data.requiresConfirmation) {
        // Server warns about incomplete matches — show force confirm
        setIncompleteCount(data.incompleteCount ?? 0)
        setForceCompleteOpen(true)
        return
      }

      if (!data.success) { setError(data.error ?? "Error al actualizar"); return }
      onRefresh ? onRefresh() : router.refresh()
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  async function forceComplete() {
    setForceCompleteLoading(true)
    await updateStatus("completed", true)
    setForceCompleteLoading(false)
    setForceCompleteOpen(false)
  }

  async function cancelTournament() {
    setCancelLoading(true)
    await updateStatus("cancelled")
    setCancelLoading(false)
    setCancelOpen(false)
  }

  return (
    <div className="bg-card border-2 border-dashed border-foreground/30 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Settings className="size-4 text-foreground" />
        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground">Panel de gestión</p>
        <span className="ml-auto text-[10px] text-zinc-400">Solo visible para ti</span>
        {!["completed", "cancelled"].includes(currentStatus) && (
          <button
            onClick={() => void openEdit()}
            className="flex items-center gap-1 text-[10px] font-black text-zinc-400 hover:text-foreground transition-colors"
          >
            <Pencil className="size-3" /> Editar
          </button>
        )}
      </div>

      <div className="bg-muted/50 rounded-xl p-3">
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
          <button
            onClick={() => void updateStatus(nextAction.to)}
            disabled={loading}
            className={`w-full py-3 rounded-xl text-sm font-black uppercase tracking-[0.1em] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${nextAction.color}`}
          >
            <Icon className="size-4" />
            {loading ? "Actualizando..." : nextAction.action}
          </button>
          <p className="text-xs text-zinc-400 text-center -mt-2">{nextAction.description}</p>
        </>
      )})()}

      {CANCEL_ALLOWED.includes(currentStatus) && (
        <div className="border-t border-border pt-3">
          <button
            onClick={() => setCancelOpen(true)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-600 transition-colors font-bold"
          >
            <XCircle className="size-3.5" /> Cancelar torneo
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}

      {/* Cancel confirm */}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar torneo"
        description={currentStatus === "in_progress"
          ? "¿Seguro que quieres cancelar el torneo? Los participantes con pago serán reembolsados automáticamente. Esta acción no se puede deshacer."
          : "¿Seguro que quieres cancelar el torneo? Esta acción no se puede deshacer."}
        confirmLabel="Sí, cancelar"
        variant="danger"
        loading={cancelLoading}
        onConfirm={cancelTournament}
      />

      {/* Force-complete confirm */}
      <ConfirmDialog
        open={forceCompleteOpen}
        onOpenChange={setForceCompleteOpen}
        title="Partidos incompletos"
        description={`Quedan ${incompleteCount} partido${incompleteCount !== 1 ? "s" : ""} sin resultado. ¿Finalizar el torneo de todas formas?`}
        confirmLabel="Finalizar de todas formas"
        variant="default"
        loading={forceCompleteLoading}
        onConfirm={forceComplete}
      />

      {/* Edit sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full max-w-sm flex flex-col gap-4 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base font-black uppercase tracking-tight text-foreground">Editar torneo</SheetTitle>
          </SheetHeader>
          {editError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{editError}</p>}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">Nombre *</label>
              <input className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-foreground bg-card" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} maxLength={100} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">Modalidad</label>
              <input className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-foreground bg-card" value={editForm.modality} onChange={e => setEditForm(f => ({ ...f, modality: e.target.value }))} placeholder="Singles, Dobles…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">Fecha</label>
                <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-foreground bg-card" value={editForm.start_date} onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">Hora</label>
                <input type="time" className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-foreground bg-card" value={editForm.start_time} onChange={e => setEditForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">Fecha cierre</label>
              <input type="date" className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-foreground bg-card" value={editForm.end_date} onChange={e => setEditForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">Máx. jugadores</label>
                <input type="number" min={2} max={256} className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-foreground bg-card" value={editForm.max_participants} onChange={e => setEditForm(f => ({ ...f, max_participants: parseInt(e.target.value) || 16 }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">Inscripción $</label>
                <input type="number" min={0} step={0.01} className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-foreground bg-card" value={editForm.entry_fee} onChange={e => setEditForm(f => ({ ...f, entry_fee: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">Descripción</label>
              <textarea rows={3} className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-foreground bg-card resize-none" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Información adicional…" maxLength={1000} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditOpen(false)} className="flex-1 border border-border rounded-full py-2.5 text-sm font-bold text-zinc-600 hover:bg-muted/50 transition-colors">Cancelar</button>
              <button onClick={() => void saveEdit()} disabled={editLoading || editForm.name.trim().length < 3} className="flex-1 bg-foreground hover:bg-foreground/90 text-white rounded-full py-2.5 text-sm font-bold transition-colors disabled:opacity-50">
                {editLoading ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
