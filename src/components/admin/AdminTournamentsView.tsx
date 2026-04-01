"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, XCircle, X } from "lucide-react"
import { StatCard } from "@/components/shared/StatCard"
import { Trophy, Users, CalendarCheck } from "lucide-react"
import type { TournamentAdmin } from "@/lib/admin/queries"

// ── constants ─────────────────────────────────────────────────────────────────

const SPORTS = [
  { value: "futbol",      label: "Fútbol" },
  { value: "padel",       label: "Pádel" },
  { value: "tenis",       label: "Tenis" },
  { value: "pickleball",  label: "Pickleball" },
] as const

type SportValue = typeof SPORTS[number]["value"]

const STATUS_LABELS: Record<string, string> = {
  open:        "Abierto",
  in_progress: "En curso",
  completed:   "Completado",
  cancelled:   "Cancelado",
  draft:       "Borrador",
}

const STATUS_CLASSES: Record<string, string> = {
  open:        "bg-blue-50 text-blue-700 border border-blue-100",
  in_progress: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  completed:   "bg-zinc-100 text-zinc-600 border border-zinc-200",
  cancelled:   "bg-red-50 text-red-600 border border-red-100",
  draft:       "bg-amber-50 text-amber-700 border border-amber-100",
}

const SPORT_CLASSES: Record<string, string> = {
  padel:       "bg-violet-50 text-violet-700",
  tenis:       "bg-yellow-50 text-yellow-700",
  futbol:      "bg-emerald-50 text-emerald-700",
  pickleball:  "bg-orange-50 text-orange-700",
}

const TERMINAL_STATUSES = new Set(["completed", "cancelled"])

// ── small helpers ─────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function SportBadge({ sport }: { sport: string }) {
  const cls = SPORT_CLASSES[sport.toLowerCase()] ?? "bg-zinc-100 text-zinc-600"
  return (
    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${cls}`}>
      {sport}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_CLASSES[status] ?? "bg-zinc-100 text-zinc-500"
  return (
    <span className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-0.5 rounded-full ${cls}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ── form types ────────────────────────────────────────────────────────────────

interface TournamentFormState {
  name: string
  clubId: string
  sport: SportValue
  modality: string
  maxParticipants: string
  entryFee: string
  startDate: string
  endDate: string
  description: string
}

const EMPTY_FORM: TournamentFormState = {
  name: "",
  clubId: "",
  sport: "padel",
  modality: "",
  maxParticipants: "16",
  entryFee: "0",
  startDate: "",
  endDate: "",
  description: "",
}

function formFromTournament(t: TournamentAdmin, clubs: ClubOption[]): TournamentFormState {
  const matchedClub = clubs.find((c) => c.name === t.club_name)
  return {
    name:            t.name,
    clubId:          matchedClub?.id ?? "",
    sport:           t.sport as SportValue,
    modality:        t.modality ?? "",
    maxParticipants: String(t.max_participants),
    entryFee:        String(t.entry_fee),
    startDate:       t.start_date ?? "",
    endDate:         t.end_date ?? "",
    description:     "",
  }
}

// ── confirm dialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

function ConfirmDialog({ message, onConfirm, onCancel, loading }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6 w-full max-w-sm shadow-xl">
        <p className="text-sm font-bold text-[#0a0a0a] leading-snug">{message}</p>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 border border-[#e5e5e5] rounded-full py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-600 text-white rounded-full py-2 text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Procesando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── tournament form modal ─────────────────────────────────────────────────────

interface ClubOption {
  id: string
  name: string
}

interface TournamentModalProps {
  mode: "create" | "edit"
  initial: TournamentFormState
  clubs: ClubOption[]
  onClose: () => void
  onSubmit: (form: TournamentFormState) => Promise<void>
  error: string | null
  loading: boolean
}

function TournamentModal({
  mode,
  initial,
  clubs,
  onClose,
  onSubmit,
  error,
  loading,
}: TournamentModalProps) {
  const [form, setForm] = useState<TournamentFormState>(initial)

  function set(key: keyof TournamentFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void onSubmit(form)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6 w-full max-w-lg shadow-xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black uppercase tracking-tight text-[#0a0a0a]">
            {mode === "create" ? "Crear torneo" : "Editar torneo"}
          </h2>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors"
          >
            <X className="size-4 text-zinc-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              minLength={3}
              maxLength={100}
              placeholder="Torneo de Pádel Abierto…"
              className="border border-[#e5e5e5] rounded-xl px-3 py-2.5 text-sm text-[#0a0a0a] placeholder:text-zinc-400 outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8"
            />
          </div>

          {/* Club */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
              Club <span className="text-red-500">*</span>
            </label>
            <select
              value={form.clubId}
              onChange={(e) => set("clubId", e.target.value)}
              required
              className="border border-[#e5e5e5] rounded-xl px-3 py-2.5 text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white"
            >
              <option value="">Seleccionar club…</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Sport + Modality */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Deporte <span className="text-red-500">*</span>
              </label>
              <select
                value={form.sport}
                onChange={(e) => set("sport", e.target.value as SportValue)}
                className="border border-[#e5e5e5] rounded-xl px-3 py-2.5 text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white"
              >
                {SPORTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Modalidad
              </label>
              <input
                type="text"
                value={form.modality}
                onChange={(e) => set("modality", e.target.value)}
                maxLength={50}
                placeholder="Individual, Dobles…"
                className="border border-[#e5e5e5] rounded-xl px-3 py-2.5 text-sm text-[#0a0a0a] placeholder:text-zinc-400 outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8"
              />
            </div>
          </div>

          {/* Max participants + Entry fee */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Máx. participantes <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.maxParticipants}
                onChange={(e) => set("maxParticipants", e.target.value)}
                required
                min={2}
                max={256}
                className="border border-[#e5e5e5] rounded-xl px-3 py-2.5 text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Inscripción (USD)
              </label>
              <input
                type="number"
                value={form.entryFee}
                onChange={(e) => set("entryFee", e.target.value)}
                min={0}
                step={0.01}
                className="border border-[#e5e5e5] rounded-xl px-3 py-2.5 text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8"
              />
            </div>
          </div>

          {/* Start date + End date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Fecha inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                required
                className="border border-[#e5e5e5] rounded-xl px-3 py-2.5 text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Fecha fin
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className="border border-[#e5e5e5] rounded-xl px-3 py-2.5 text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8"
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
              Descripción
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Descripción opcional del torneo…"
              className="border border-[#e5e5e5] rounded-xl px-3 py-2.5 text-sm text-[#0a0a0a] placeholder:text-zinc-400 outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border border-[#e5e5e5] rounded-full py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#0a0a0a] text-white rounded-full py-2.5 text-sm font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {loading
                ? mode === "create" ? "Creando…" : "Guardando…"
                : mode === "create" ? "Crear torneo" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

interface AdminTournamentsViewProps {
  tournaments: TournamentAdmin[]
  clubs: ClubOption[]
}

type ModalMode = { type: "create" } | { type: "edit"; tournament: TournamentAdmin }

interface CancelTarget {
  id: string
  name: string
}

export function AdminTournamentsView({ tournaments, clubs }: AdminTournamentsViewProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Modal state
  const [modal, setModal] = useState<ModalMode | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Cancel confirm state
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  // Derived stats
  const total     = tournaments.length
  const active    = tournaments.filter((t) => t.status === "open" || t.status === "in_progress").length
  const completed = tournaments.filter((t) => t.status === "completed").length
  const cancelled = tournaments.filter((t) => t.status === "cancelled").length

  // ── handlers ────────────────────────────────────────────────────────────────

  function openCreate() {
    setModalError(null)
    setModal({ type: "create" })
  }

  function openEdit(t: TournamentAdmin) {
    setModalError(null)
    setModal({ type: "edit", tournament: t })
  }

  function closeModal() {
    if (modalLoading) return
    setModal(null)
    setModalError(null)
  }

  async function handleModalSubmit(form: TournamentFormState) {
    setModalLoading(true)
    setModalError(null)

    const payload = {
      name:            form.name.trim(),
      clubId:          form.clubId,
      sport:           form.sport,
      modality:        form.modality || undefined,
      maxParticipants: parseInt(form.maxParticipants, 10),
      entryFee:        parseFloat(form.entryFee),
      startDate:       form.startDate,
      endDate:         form.endDate || undefined,
      description:     form.description || undefined,
    }

    try {
      let res: Response

      if (modal?.type === "create") {
        res = await fetch("/api/admin/tournaments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else if (modal?.type === "edit") {
        res = await fetch(`/api/admin/tournaments/${modal.tournament.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        return
      }

      const json = (await res.json()) as { success: boolean; error?: string | null }
      if (!json.success) {
        setModalError(json.error ?? "Error desconocido")
        return
      }

      setModal(null)
      startTransition(() => router.refresh())
    } catch {
      setModalError("Error de conexión. Intenta de nuevo.")
    } finally {
      setModalLoading(false)
    }
  }

  function requestCancel(t: TournamentAdmin) {
    setCancelError(null)
    setCancelTarget({ id: t.id, name: t.name })
  }

  async function confirmCancel() {
    if (!cancelTarget) return
    setCancelLoading(true)
    setCancelError(null)

    try {
      const res = await fetch(`/api/admin/tournaments/${cancelTarget.id}`, {
        method: "DELETE",
      })
      const json = (await res.json()) as { success: boolean; error?: string | null }
      if (!json.success) {
        setCancelError(json.error ?? "Error desconocido")
        return
      }
      setCancelTarget(null)
      startTransition(() => router.refresh())
    } catch {
      setCancelError("Error de conexión. Intenta de nuevo.")
    } finally {
      setCancelLoading(false)
    }
  }

  // ── initial form state ───────────────────────────────────────────────────────

  const modalInitial: TournamentFormState =
    modal?.type === "edit"
      ? formFromTournament(modal.tournament, clubs)
      : EMPTY_FORM

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Torneos"  value={total}     icon={Trophy}       variant="default" />
        <StatCard label="Activos"        value={active}    icon={Users}        variant="success" />
        <StatCard label="Completados"    value={completed} icon={CalendarCheck} variant="accent" />
        <StatCard label="Cancelados"     value={cancelled} icon={XCircle}      variant="warning" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">
          {total} torneo{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#0a0a0a] text-white rounded-full px-4 py-2 text-sm font-bold hover:bg-zinc-800 transition-colors"
        >
          <Plus className="size-3.5" />
          Crear torneo
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-[#e5e5e5] overflow-hidden">
        {tournaments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-zinc-400">No hay torneos registrados</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 border-b border-[#f0f0f0] bg-zinc-50">
              {["Nombre", "Deporte", "Club", "Estado", "Participantes", "Fecha inicio", ""].map((h) => (
                <p key={h} className="text-[10px] font-black uppercase tracking-wide text-zinc-400 last:text-right">
                  {h}
                </p>
              ))}
            </div>

            <div className="flex flex-col divide-y divide-[#f0f0f0]">
              {tournaments.map((t) => {
                const isTerminal = TERMINAL_STATUSES.has(t.status)
                return (
                  <div
                    key={t.id}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3.5 items-center hover:bg-zinc-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#0a0a0a] leading-tight">{t.name}</p>
                      {t.entry_fee > 0 && (
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Inscripción: ${t.entry_fee.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div><SportBadge sport={t.sport} /></div>
                    <p className="text-xs text-zinc-600 truncate">{t.club_name ?? "—"}</p>
                    <div><StatusBadge status={t.status} /></div>
                    <p className="text-sm font-black text-[#0a0a0a] text-right">
                      {t.participant_count}
                      <span className="text-zinc-400 font-normal">/{t.max_participants}</span>
                    </p>
                    <p className="text-xs text-zinc-500 text-right">{formatDate(t.start_date)}</p>

                    {/* Row actions */}
                    <div className="flex items-center gap-1.5 justify-end">
                      {!isTerminal && (
                        <button
                          onClick={() => openEdit(t)}
                          title="Editar"
                          className="size-7 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors text-zinc-500 hover:text-[#0a0a0a]"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      )}
                      {!isTerminal && (
                        <button
                          onClick={() => requestCancel(t)}
                          title="Cancelar torneo"
                          className="size-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors text-zinc-400 hover:text-red-600"
                        >
                          <XCircle className="size-3.5" />
                        </button>
                      )}
                      {isTerminal && (
                        <span className="text-[10px] text-zinc-300 font-bold uppercase px-1">—</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Cancel error banner (outside modal) */}
      {cancelError && !cancelTarget && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {cancelError}
        </div>
      )}

      {/* Tournament form modal */}
      {modal && (
        <TournamentModal
          mode={modal.type}
          initial={modalInitial}
          clubs={clubs}
          onClose={closeModal}
          onSubmit={handleModalSubmit}
          error={modalError}
          loading={modalLoading}
        />
      )}

      {/* Cancel confirm dialog */}
      {cancelTarget && (
        <ConfirmDialog
          message={`¿Cancelar el torneo "${cancelTarget.name}"? Esta acción no se puede deshacer y reembolsará a los participantes inscritos.`}
          onConfirm={confirmCancel}
          onCancel={() => { if (!cancelLoading) setCancelTarget(null) }}
          loading={cancelLoading}
        />
      )}
    </>
  )
}
