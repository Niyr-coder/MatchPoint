"use client"

import { useEffect, useState, useCallback } from "react"
import { Users, DollarSign, Check, Clock, Gift, Trash2, RefreshCw } from "lucide-react"

interface ParticipantProfile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

interface Participant {
  id: string
  user_id: string
  status: string
  payment_status: "pending" | "paid" | "waived"
  seed: number | null
  notes: string | null
  registered_at: string
  profiles: ParticipantProfile | null
}

const PAYMENT_STYLES = {
  paid:    { label: "Pagado",  icon: Check,  cls: "bg-green-100 text-green-700 border-green-200" },
  pending: { label: "Pendiente", icon: Clock, cls: "bg-amber-50 text-amber-700 border-amber-200" },
  waived:  { label: "Gratis",  icon: Gift,  cls: "bg-zinc-100 text-zinc-500 border-zinc-200" },
}

export function ParticipantsManager({
  tournamentId,
  isCreator,
  entryFee,
}: {
  tournamentId: string
  isCreator: boolean
  entryFee: number
}) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${tournamentId}/participants`)
    if (!res.ok) return
    const json = await res.json() as { success: boolean; data: Participant[] }
    if (json.success) setParticipants(json.data)
    setLoading(false)
  }, [tournamentId])

  useEffect(() => { void load() }, [load])

  async function setPayment(userId: string, payment_status: string) {
    setActionId(userId)
    await fetch(`/api/tournaments/${tournamentId}/participants/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_status }),
    })
    await load()
    setActionId(null)
  }

  async function removeParticipant(userId: string) {
    setActionId(userId)
    await fetch(`/api/tournaments/${tournamentId}/participants/${userId}`, { method: "DELETE" })
    setConfirmDelete(null)
    await load()
    setActionId(null)
  }

  const paidCount = participants.filter(p => p.payment_status === "paid").length
  const collected = paidCount * entryFee

  const initials = (p: Participant) => {
    const name = p.profiles?.full_name ?? p.profiles?.username ?? "?"
    return name.charAt(0).toUpperCase()
  }

  const displayName = (p: Participant) =>
    p.profiles?.full_name ?? p.profiles?.username ?? p.user_id.slice(0, 8)

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6 flex items-center justify-center gap-2 text-zinc-400 text-sm">
        <RefreshCw className="size-4 animate-spin" />
        Cargando participantes…
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white border border-[#e5e5e5] overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[#f0f0f0] flex items-center gap-2">
        <Users className="size-4 text-zinc-400" />
        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">
          Participantes
        </p>
        <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
          {participants.length}
        </span>
        {entryFee > 0 && isCreator && (
          <div className="ml-auto flex items-center gap-1.5 text-xs font-bold text-green-700">
            <DollarSign className="size-3.5" />
            ${collected} recaudados
            <span className="text-zinc-400 font-normal">({paidCount}/{participants.length} pagados)</span>
          </div>
        )}
      </div>

      {/* List */}
      {participants.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-zinc-400">Aún no hay participantes inscritos.</p>
        </div>
      ) : (
        <ul className="divide-y divide-[#f5f5f5]">
          {participants.map((p, idx) => {
            const payMeta = PAYMENT_STYLES[p.payment_status]
            const PayIcon = payMeta.icon
            const isActing = actionId === p.user_id

            return (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                {/* Seed / number */}
                <span className="text-[11px] font-black text-zinc-300 w-5 text-right shrink-0">
                  {p.seed ?? idx + 1}
                </span>

                {/* Avatar */}
                <div className="size-8 rounded-full bg-[#1a56db]/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-black text-[#1a56db]">{initials(p)}</span>
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#0a0a0a] truncate">{displayName(p)}</p>
                  <p className="text-[10px] text-zinc-400">
                    {new Date(p.registered_at).toLocaleDateString("es-EC", { day: "numeric", month: "short" })}
                  </p>
                </div>

                {/* Payment badge + creator actions */}
                {entryFee > 0 ? (
                  isCreator ? (
                    <div className="flex items-center gap-1">
                      {(["paid", "pending", "waived"] as const).map(ps => (
                        <button
                          key={ps}
                          disabled={isActing}
                          onClick={() => setPayment(p.user_id, ps)}
                          title={PAYMENT_STYLES[ps].label}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                            p.payment_status === ps
                              ? PAYMENT_STYLES[ps].cls + " opacity-100"
                              : "bg-zinc-50 text-zinc-400 border-zinc-200 opacity-60 hover:opacity-100"
                          }`}
                        >
                          {PAYMENT_STYLES[ps].label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 ${payMeta.cls}`}>
                      <PayIcon className="size-3" />
                      {payMeta.label}
                    </span>
                  )
                ) : null}

                {/* Delete */}
                {isCreator && (
                  confirmDelete === p.user_id ? (
                    <div className="flex items-center gap-1">
                      <button
                        disabled={isActing}
                        onClick={() => removeParticipant(p.user_id)}
                        className="text-[10px] font-black text-red-600 border border-red-200 rounded-lg px-2 py-1"
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-[10px] font-bold text-zinc-400 px-2 py-1"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(p.user_id)}
                      className="text-zinc-300 hover:text-red-500 transition-colors"
                      title="Eliminar participante"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
