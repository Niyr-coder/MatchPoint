"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, XCircle, ChevronRight } from "lucide-react"
import { StatCard } from "@/components/shared/StatCard"
import { Trophy, Users, CalendarCheck } from "lucide-react"
import { AdminDotsMenu } from "@/components/admin/shared/AdminDotsMenu"
import { AdminInlinePanel } from "@/components/admin/shared/AdminInlinePanel"
import { AdminTournamentModal } from "@/components/admin/AdminTournamentModal"
import type { TournamentAdmin } from "@/lib/admin/queries"
import type { TournamentFormState, ClubOption } from "@/components/admin/AdminTournamentModal"
import { EMPTY_TOURNAMENT_FORM } from "@/components/admin/AdminTournamentModal"

// ── constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  open:        "Abierto",
  in_progress: "En curso",
  completed:   "Completado",
  cancelled:   "Cancelado",
  draft:       "Borrador",
}

const STATUS_CLASSES: Record<string, string> = {
  open:        "bg-card text-foreground border border-border",
  in_progress: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  completed:   "bg-muted text-zinc-600 border border-zinc-200",
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
  const cls = SPORT_CLASSES[sport.toLowerCase()] ?? "bg-muted text-zinc-600"
  return (
    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${cls}`}>
      {sport}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_CLASSES[status] ?? "bg-muted text-zinc-500"
  return (
    <span className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-0.5 rounded-full ${cls}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function formFromTournament(t: TournamentAdmin, clubs: ClubOption[]): TournamentFormState {
  const matchedClub = clubs.find((c) => c.name === t.club_name)
  return {
    name:            t.name,
    clubId:          matchedClub?.id ?? "",
    sport:           t.sport as TournamentFormState["sport"],
    modality:        t.modality ?? "",
    maxParticipants: String(t.max_participants),
    entryFee:        String(t.entry_fee),
    startDate:       t.start_date ?? "",
    endDate:         t.end_date ?? "",
    description:     "",
  }
}

// ── inline confirm dialog ─────────────────────────────────────────────────────

interface ConfirmDialogProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

function ConfirmDialog({ message, onConfirm, onCancel, loading }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="rounded-2xl bg-card border border-border p-6 w-full max-w-sm shadow-xl">
        <p className="text-sm font-bold text-foreground leading-snug">{message}</p>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 border border-border rounded-full py-2 text-sm font-bold text-zinc-600 hover:bg-secondary transition-colors disabled:opacity-50"
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

  // Expand state
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function toggleExpand(tournamentId: string) {
    setExpandedId((prev) => (prev === tournamentId ? null : tournamentId))
  }

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

  // ── expanded row renderer ────────────────────────────────────────────────────

  function renderTournamentExpanded(t: TournamentAdmin) {
    const isTerminal = TERMINAL_STATUSES.has(t.status)

    const chips = [
      t.club_name ?? null,
      `${t.participant_count}/${t.max_participants} participantes`,
      t.entry_fee > 0 ? `$${t.entry_fee.toFixed(2)} inscripción` : null,
      t.modality ?? null,
    ].filter(Boolean) as string[]

    const avatar = (
      <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
        <Trophy className="size-5 text-amber-600" />
      </div>
    )

    return (
      <AdminInlinePanel
        avatar={avatar}
        name={t.name}
        subtitle={t.club_name ?? "Sin club"}
        chips={chips}
        badge={<StatusBadge status={t.status} />}
        actions={
          <>
            {!isTerminal && (
              <button
                onClick={() => openEdit(t)}
                className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-border text-zinc-600 hover:bg-secondary transition-colors"
              >
                Editar
              </button>
            )}
            <button
              className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-border text-zinc-600 hover:bg-secondary transition-colors"
            >
              Ver bracket
            </button>
            {!isTerminal && (
              <button
                onClick={() => requestCancel(t)}
                className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                Cancelar torneo
              </button>
            )}
          </>
        }
      />
    )
  }

  // ── initial form state ───────────────────────────────────────────────────────

  const modalInitial: TournamentFormState =
    modal?.type === "edit"
      ? formFromTournament(modal.tournament, clubs)
      : EMPTY_TOURNAMENT_FORM

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
          className="flex items-center gap-2 bg-foreground text-background rounded-full px-4 py-2 text-sm font-bold hover:bg-foreground/90 transition-colors"
        >
          <Plus className="size-3.5" />
          Crear torneo
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        {tournaments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-zinc-400">No hay torneos registrados</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[32px_2fr_1fr_1fr_1fr_1fr_1fr_40px] gap-3 px-5 py-3 border-b border-border bg-secondary">
              {["", "Nombre", "Deporte", "Club", "Estado", "Participantes", "Fecha inicio", ""].map((h, i) => (
                <p key={i} className="text-[10px] font-black uppercase tracking-wide text-zinc-400 last:text-right">
                  {h}
                </p>
              ))}
            </div>

            <div className="flex flex-col divide-y divide-border">
              {tournaments.map((t) => {
                const isTerminal = TERMINAL_STATUSES.has(t.status)
                const isExpanded = expandedId === t.id
                return (
                  <div key={t.id}>
                    <div
                      className={`grid grid-cols-[32px_2fr_1fr_1fr_1fr_1fr_1fr_40px] gap-3 px-5 py-3.5 items-center cursor-pointer transition-colors ${
                        isExpanded ? "bg-[#f8faff]" : "hover:bg-zinc-50"
                      }`}
                      onClick={() => toggleExpand(t.id)}
                    >
                      {/* Expand chevron */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExpand(t.id) }}
                        className="flex items-center justify-center text-zinc-400 hover:text-zinc-700"
                        aria-label={isExpanded ? "Colapsar" : "Expandir"}
                      >
                        <ChevronRight className={`size-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                      </button>

                      {/* Name */}
                      <div>
                        <p className="text-sm font-bold text-foreground leading-tight">{t.name}</p>
                        {t.entry_fee > 0 && (
                          <p className="text-[10px] text-zinc-400 mt-0.5">Inscripción: ${t.entry_fee.toFixed(2)}</p>
                        )}
                      </div>

                      <div><SportBadge sport={t.sport} /></div>
                      <p className="text-xs text-zinc-600 truncate">{t.club_name ?? "—"}</p>
                      <div><StatusBadge status={t.status} /></div>
                      <p className="text-sm font-black text-foreground text-right">
                        {t.participant_count}
                        <span className="text-zinc-400 font-normal">/{t.max_participants}</span>
                      </p>
                      <p className="text-xs text-zinc-500 text-right">{formatDate(t.start_date)}</p>

                      {/* Dots menu */}
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <AdminDotsMenu
                          items={[
                            { label: "Editar", disabled: isTerminal, onClick: () => openEdit(t) },
                            { label: "Ver bracket", onClick: () => { /* TODO */ } },
                            { label: "Cancelar", variant: "danger", disabled: isTerminal, onClick: () => requestCancel(t) },
                          ]}
                        />
                      </div>
                    </div>

                    {/* Expanded panel */}
                    {isExpanded && renderTournamentExpanded(t)}
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
        <AdminTournamentModal
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
