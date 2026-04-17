"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Link2, UserPlus, Trash2 } from "lucide-react"
import { AddPlayerModal } from "@/features/organizer/components/AddPlayerModal"
import { RotationPanel } from "@/features/organizer/components/RotationPanel"
import { BracketPanel } from "@/features/organizer/components/BracketPanel"
import { QuedadaLeaderboard } from "@/features/organizer/components/QuedadaLeaderboard"
import type { Quedada, QuedadaParticipant } from "@/features/organizer/types"

const DYNAMIC_LABELS: Record<string, string> = {
  standard: "Estándar",
  king_of_court: "King of the Court",
  popcorn: "Popcorn",
  round_robin: "Round Robin",
}

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  draft:       { label: "Borrador",   classes: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  open:        { label: "Abierta",    classes: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "En curso",   classes: "bg-green-50 text-green-700 border-green-200" },
  completed:   { label: "Completada", classes: "bg-zinc-50 text-zinc-500 border-zinc-200" },
  cancelled:   { label: "Cancelada",  classes: "bg-red-50 text-red-600 border-red-200" },
}

const TABS = ["Jugadores", "Bracket / Resultados", "Resultados", "Invitación"] as const
type Tab = (typeof TABS)[number]

interface Props {
  quedada: Quedada
  initialParticipants: QuedadaParticipant[]
}

export function QuedadaManagePanel({ quedada, initialParticipants }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("Jugadores")
  const [participants, setParticipants] = useState(initialParticipants)
  const [showAddModal, setShowAddModal] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [inviteLink] = useState(`matchpoint.top/join/${quedada.id.slice(0, 8)}`)

  const st = STATUS_STYLES[quedada.status] ?? STATUS_STYLES.open

  const refreshParticipants = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${quedada.id}/participants`)
    const json = (await res.json()) as { success: boolean; data?: QuedadaParticipant[] }
    if (json.success && json.data) setParticipants(json.data)
    setShowAddModal(false)
  }, [quedada.id])

  async function removeParticipant(participantId: string) {
    setRemovingId(participantId)
    try {
      await fetch(`/api/tournaments/${quedada.id}/participants/${participantId}`, {
        method: "DELETE",
      })
      setParticipants((prev) => prev.filter((p) => p.id !== participantId))
    } finally {
      setRemovingId(null)
    }
  }

  function displayName(p: QuedadaParticipant): string {
    if (p.guest_name) return `${p.guest_name} ${p.guest_lastname ?? ""}`.trim()
    return p.profiles?.full_name ?? p.profiles?.username ?? "Usuario"
  }

  async function handleCancel() {
    if (!confirm("¿Cancelar esta quedada?")) return
    await fetch(`/api/tournaments/${quedada.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    })
    router.push("/dashboard/organizer")
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-2xl bg-card border border-foreground/30 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-black">{quedada.name}</h1>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${st.classes}`}
              >
                {st.label}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {DYNAMIC_LABELS[quedada.game_dynamic ?? "standard"]} · {quedada.modality} ·{" "}
              {quedada.start_date}
              {quedada.start_time ? ` ${quedada.start_time}` : ""}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-[11px] font-black text-red-600 border border-red-200 px-3 py-1.5 rounded-xl hover:bg-red-50 transition-colors shrink-0"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-wide transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-foreground text-foreground"
                : "border-transparent text-zinc-400 hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* TAB: Jugadores */}
      {tab === "Jugadores" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold">
                {participants.length} / {quedada.max_participants} jugadores
              </span>
              <div className="mt-1 h-1.5 w-48 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (participants.length / (quedada.max_participants ?? 1)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide px-3 py-2 border border-border rounded-xl hover:border-foreground transition-colors"
            >
              <UserPlus className="size-3.5" />
              Agregar
            </button>
          </div>

          {participants.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 text-sm border border-dashed border-border rounded-2xl">
              Sin jugadores aún. Agrega manualmente o comparte el link.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border"
                >
                  <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                    {displayName(p)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{displayName(p)}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {p.guest_name && (
                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold">
                          INVITADO
                        </span>
                      )}
                      <span className="text-[11px] text-zinc-400">{p.status}</span>
                    </div>
                  </div>
                  <button
                    disabled={removingId === p.id}
                    onClick={() => removeParticipant(p.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Bracket / Resultados */}
      {tab === "Bracket / Resultados" && (
        <div>
          {quedada.game_dynamic === "standard" || quedada.game_dynamic === "round_robin" ? (
            <BracketPanel quedada={quedada} participantCount={participants.length} />
          ) : (
            <RotationPanel
              quedadaId={quedada.id}
              dynamic={quedada.game_dynamic as "king_of_court" | "popcorn"}
              participants={participants}
              modality={quedada.modality ?? "Singles"}
              initialCourtCount={quedada.court_count ?? 1}
            />
          )}
        </div>
      )}

      {/* TAB: Resultados */}
      {tab === "Resultados" && (
        <QuedadaLeaderboard quedadaId={quedada.id} quedadaName={quedada.name} />
      )}

      {/* TAB: Invitación */}
      {tab === "Invitación" && (
        <div className="flex flex-col gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-[10px] font-black uppercase tracking-wide text-green-700 mb-2">
              Link de invitación activo
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm text-green-800 bg-white border border-green-200 px-3 py-2 rounded-lg font-mono truncate">
                {inviteLink}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(`https://${inviteLink}`)}
                className="px-3 py-2 text-[11px] font-black text-green-700 border border-green-300 rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap"
              >
                Copiar
              </button>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs text-zinc-500">
            <Link2 className="size-3.5 mt-0.5 shrink-0" />
            <span>
              Cualquier{" "}
              {quedada.club_id ? "miembro del club" : "usuario de la plataforma"} puede
              unirse con este link hasta que cierres las inscripciones.
            </span>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddPlayerModal
          quedadaId={quedada.id}
          onClose={() => setShowAddModal(false)}
          onAdded={refreshParticipants}
        />
      )}
    </div>
  )
}
