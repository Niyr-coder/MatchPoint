"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Users, DollarSign, Check, Clock, Gift, RefreshCw, UserPlus, Download, Search, X, AlertCircle } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"

type PaymentStatus = "pending" | "paid" | "waived" | "refunded"
type TournamentStatus = "draft" | "open" | "in_progress" | "completed" | "cancelled"
type PaymentFilter = "all" | PaymentStatus

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
  payment_status: PaymentStatus
  seed: number | null
  notes: string | null
  registered_at: string
  profiles: ParticipantProfile | null
}

interface SearchUser {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

const PAYMENT_META: Record<PaymentStatus, { label: string; icon: React.ElementType; cls: string }> = {
  paid:      { label: "Pagado",       icon: Check,         cls: "bg-green-100 text-green-700 border-green-200" },
  pending:   { label: "Pendiente",    icon: Clock,         cls: "bg-amber-50 text-amber-700 border-amber-200" },
  waived:    { label: "Gratis",       icon: Gift,          cls: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  refunded:  { label: "Reembolsado",  icon: AlertCircle,   cls: "bg-white text-[#0a0a0a] border-[#e5e5e5]" },
}

const FILTER_TABS: { key: PaymentFilter; label: string }[] = [
  { key: "all",      label: "Todos" },
  { key: "pending",  label: "Pendiente" },
  { key: "paid",     label: "Pagado" },
  { key: "waived",   label: "Gratis" },
  { key: "refunded", label: "Reembolsado" },
]

function displayName(p: Participant): string {
  return p.profiles?.full_name ?? p.profiles?.username ?? p.user_id.slice(0, 8)
}

function initials(p: Participant): string {
  const name = p.profiles?.full_name ?? p.profiles?.username ?? "?"
  return name.charAt(0).toUpperCase()
}

function exportCSV(participants: Participant[]): void {
  const rows = [
    ["#", "Nombre", "Usuario", "Estado", "Pago", "Inscrito"],
    ...participants.map((p, i) => [
      String(p.seed ?? i + 1),
      p.profiles?.full_name ?? "",
      p.profiles?.username ?? "",
      p.status,
      p.payment_status,
      new Date(p.registered_at).toLocaleDateString("es-EC"),
    ]),
  ]
  const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "participantes.csv"
  a.click()
  URL.revokeObjectURL(url)
}

export function ParticipantsManager({
  tournamentId,
  tournamentStatus,
  isCreator,
  entryFee,
  refreshTrigger = 0,
  onRefresh,
}: {
  tournamentId: string
  tournamentStatus: TournamentStatus
  isCreator: boolean
  entryFee: number
  refreshTrigger?: number
  onRefresh?: () => void
}) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [payFilter, setPayFilter] = useState<PaymentFilter>("all")

  // Add sheet
  const [addOpen, setAddOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Remove confirm (pre-tournament)
  const [removeConfirmUserId, setRemoveConfirmUserId] = useState<string | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  // Withdraw sheet (mid-tournament)
  const [withdrawUserId, setWithdrawUserId] = useState<string | null>(null)
  const [withdrawReason, setWithdrawReason] = useState("")
  const [withdrawLoading, setWithdrawLoading] = useState(false)

  const isReadOnly = tournamentStatus === "completed" || tournamentStatus === "cancelled"
  const isInProgress = tournamentStatus === "in_progress"

  const load = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${tournamentId}/participants`)
    if (res.ok) {
      const json = await res.json() as { success: boolean; data: Participant[] }
      if (json.success) setParticipants(json.data)
    }
    setLoading(false)
  }, [tournamentId])

  useEffect(() => { void load() }, [load])
  useEffect(() => { if (refreshTrigger > 0) void load() }, [refreshTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    if (!addOpen) return
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (!searchQuery.trim()) { setSearchResults([]); return }
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true)
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`)
      if (res.ok) {
        const json = await res.json() as { success: boolean; data: SearchUser[] }
        if (json.success) setSearchResults(json.data)
      }
      setSearchLoading(false)
    }, 400)
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [searchQuery, addOpen])

  function openAddSheet() {
    setSearchQuery("")
    setSearchResults([])
    setAddError(null)
    setAddOpen(true)
  }

  async function addParticipant(userId: string) {
    setAddError(null)
    setActionId(userId)
    const res = await fetch(`/api/tournaments/${tournamentId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    const json = await res.json() as { success: boolean; error?: string }
    setActionId(null)
    if (!json.success) { setAddError(json.error ?? "Error al agregar"); return }
    await load()
    onRefresh?.()
    setAddOpen(false)
  }

  async function setPayment(userId: string, payment_status: PaymentStatus) {
    setActionId(userId)
    await fetch(`/api/tournaments/${tournamentId}/participants/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_status }),
    })
    await load()
    setActionId(null)
    onRefresh?.()
  }

  async function markAllPaid() {
    const pending = participants.filter(p => p.payment_status === "pending")
    await Promise.all(pending.map(p =>
      fetch(`/api/tournaments/${tournamentId}/participants/${p.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: "paid" }),
      })
    ))
    await load()
    onRefresh?.()
  }

  async function removeParticipant() {
    if (!removeConfirmUserId) return
    setRemoveLoading(true)
    await fetch(`/api/tournaments/${tournamentId}/participants/${removeConfirmUserId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "remove" }),
    })
    setRemoveLoading(false)
    setRemoveConfirmUserId(null)
    await load()
    onRefresh?.()
  }

  async function withdrawParticipant() {
    if (!withdrawUserId) return
    setWithdrawLoading(true)
    await fetch(`/api/tournaments/${tournamentId}/participants/${withdrawUserId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "withdraw", reason: withdrawReason || undefined }),
    })
    setWithdrawLoading(false)
    setWithdrawUserId(null)
    setWithdrawReason("")
    await load()
    onRefresh?.()
  }

  const activeParticipants = participants.filter(p => p.status !== "withdrawn")
  const paidCount = activeParticipants.filter(p => p.payment_status === "paid").length
  const pendingCount = activeParticipants.filter(p => p.payment_status === "pending").length
  const collected = paidCount * entryFee

  const filtered = payFilter === "all"
    ? participants
    : participants.filter(p => p.payment_status === payFilter)

  const withdrawTarget = withdrawUserId ? participants.find(p => p.user_id === withdrawUserId) : null

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
      <div className="p-5 border-b border-[#f0f0f0] flex flex-wrap items-center gap-2">
        <Users className="size-4 text-zinc-400 shrink-0" />
        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">Participantes</p>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
          {activeParticipants.length}
        </span>
        {entryFee > 0 && isCreator && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-green-700">
            <DollarSign className="size-3.5" />
            ${collected} recaudados
            <span className="text-zinc-400 font-normal">({paidCount}/{activeParticipants.length} pagados)</span>
          </div>
        )}
        {isCreator && !isReadOnly && (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => exportCSV(participants)}
              title="Exportar CSV"
              className="text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <Download className="size-4" />
            </button>
            <button
              onClick={openAddSheet}
              className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl bg-[#0a0a0a] text-white hover:bg-[#222222] transition-colors"
            >
              <UserPlus className="size-3.5" />
              {isInProgress ? "Agregar tardío" : "Agregar"}
            </button>
          </div>
        )}
      </div>

      {/* Bulk action */}
      {isCreator && !isReadOnly && entryFee > 0 && pendingCount > 0 && (
        <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <Clock className="size-3.5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 flex-1">{pendingCount} pago{pendingCount !== 1 ? "s" : ""} pendiente{pendingCount !== 1 ? "s" : ""}</p>
          <button
            onClick={() => void markAllPaid()}
            className="text-xs font-black text-amber-700 border border-amber-300 rounded-lg px-2.5 py-1 hover:bg-amber-100 transition-colors"
          >
            Marcar todos como pagados
          </button>
        </div>
      )}

      {/* Payment filter tabs */}
      {entryFee > 0 && (
        <div className="px-5 py-2.5 border-b border-[#f0f0f0] flex gap-1 overflow-x-auto">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setPayFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.12em] shrink-0 transition-colors ${
                payFilter === tab.key
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-400 hover:text-zinc-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-zinc-400">
            {participants.length === 0 ? "Aún no hay participantes inscritos." : "Sin resultados para este filtro."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[#f5f5f5]">
          {filtered.map((p, idx) => {
            const isWithdrawn = p.status === "withdrawn"
            const payMeta = PAYMENT_META[p.payment_status] ?? PAYMENT_META.pending
            const PayIcon = payMeta.icon
            const isActing = actionId === p.user_id

            return (
              <li
                key={p.id}
                className={`flex items-center gap-3 px-5 py-3 ${isWithdrawn ? "opacity-50" : ""}`}
              >
                {/* Seed */}
                <span className="text-[11px] font-black text-zinc-300 w-5 text-right shrink-0">
                  {p.seed ?? idx + 1}
                </span>

                {/* Avatar */}
                <div className="size-8 rounded-full bg-[#0a0a0a]/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-black text-[#0a0a0a]">{initials(p)}</span>
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#0a0a0a] truncate">{displayName(p)}</p>
                  <p className="text-[10px] text-zinc-400 truncate">
                    {isWithdrawn
                      ? "Retirado"
                      : p.profiles?.username
                        ? `@${p.profiles.username}`
                        : new Date(p.registered_at).toLocaleDateString("es-EC", { day: "numeric", month: "short" })}
                  </p>
                </div>

                {/* Payment badge / toggle */}
                {entryFee > 0 && !isWithdrawn && (
                  isCreator && !isReadOnly ? (
                    <div className="flex items-center gap-1">
                      {(["paid", "pending", "waived"] as const).map(ps => (
                        <button
                          key={ps}
                          disabled={isActing}
                          onClick={() => void setPayment(p.user_id, ps)}
                          title={PAYMENT_META[ps].label}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                            p.payment_status === ps
                              ? PAYMENT_META[ps].cls + " opacity-100"
                              : "bg-zinc-50 text-zinc-400 border-zinc-200 opacity-60 hover:opacity-100"
                          }`}
                        >
                          {PAYMENT_META[ps].label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 shrink-0 ${payMeta.cls}`}>
                      <PayIcon className="size-3" />
                      {payMeta.label}
                    </span>
                  )
                )}

                {/* Action: remove (pre-tournament) or withdraw (in_progress) */}
                {isCreator && !isReadOnly && !isWithdrawn && (
                  <button
                    onClick={() => {
                      if (isInProgress) {
                        setWithdrawReason("")
                        setWithdrawUserId(p.user_id)
                      } else {
                        setRemoveConfirmUserId(p.user_id)
                      }
                    }}
                    className="text-[10px] font-black text-zinc-300 hover:text-red-500 uppercase tracking-wide transition-colors shrink-0"
                  >
                    {isInProgress ? "Retirar" : "Quitar"}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Add participant sheet */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="right" className="w-full max-w-sm flex flex-col">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-base font-black uppercase tracking-tight text-[#0a0a0a]">
              {isInProgress ? "Agregar participante tardío" : "Agregar participante"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Search input */}
            <div className="relative">
              <Search className="size-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o @usuario…"
                autoFocus
                className="w-full border border-[#e5e5e5] rounded-xl pl-9 pr-4 py-3 text-sm outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setSearchResults([]) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                  <X className="size-4" />
                </button>
              )}
            </div>

            {addError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{addError}</p>
            )}

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {searchLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-zinc-400 text-sm">
                  <RefreshCw className="size-4 animate-spin" />
                  Buscando…
                </div>
              ) : searchResults.length === 0 && searchQuery.trim() ? (
                <p className="text-center text-sm text-zinc-400 py-8">Sin resultados</p>
              ) : (
                <ul className="divide-y divide-[#f5f5f5]">
                  {searchResults.map(u => {
                    const alreadyIn = participants.some(p => p.user_id === u.id)
                    return (
                      <li key={u.id} className="flex items-center gap-3 py-3">
                        <div className="size-8 rounded-full bg-[#0a0a0a]/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-black text-[#0a0a0a]">
                            {(u.full_name ?? u.username ?? "?").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#0a0a0a] truncate">{u.full_name ?? u.username ?? u.id.slice(0, 8)}</p>
                          {u.username && <p className="text-[10px] text-zinc-400">@{u.username}</p>}
                        </div>
                        {alreadyIn ? (
                          <span className="text-[10px] text-zinc-400 font-bold">Ya inscrito</span>
                        ) : (
                          <button
                            onClick={() => void addParticipant(u.id)}
                            disabled={actionId === u.id}
                            className="text-[10px] font-black uppercase tracking-wide text-[#0a0a0a] hover:text-[#222222] disabled:opacity-50 transition-colors"
                          >
                            {actionId === u.id ? "Agregando…" : "Agregar"}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Remove confirm dialog (pre-tournament) */}
      <ConfirmDialog
        open={removeConfirmUserId !== null}
        onOpenChange={open => { if (!open) setRemoveConfirmUserId(null) }}
        title="Quitar participante"
        description="Se eliminará la inscripción de este participante. Esta acción no se puede deshacer."
        confirmLabel="Quitar"
        variant="danger"
        loading={removeLoading}
        onConfirm={removeParticipant}
      />

      {/* Withdraw sheet (mid-tournament) */}
      <Sheet open={withdrawUserId !== null} onOpenChange={open => { if (!open) { setWithdrawUserId(null); setWithdrawReason("") } }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-w-md mx-auto">
          <SheetHeader className="text-left pb-4">
            <SheetTitle className="text-base font-black uppercase tracking-tight text-[#0a0a0a]">
              Retirar participante
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4">
            {withdrawTarget && (
              <p className="text-sm text-zinc-500">
                Se retirará a <span className="font-bold text-[#0a0a0a]">{displayName(withdrawTarget)}</span> del torneo. Sus partidos pendientes se convertirán en BYEs.
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                Motivo (opcional)
              </label>
              <input
                type="text"
                value={withdrawReason}
                onChange={e => setWithdrawReason(e.target.value)}
                placeholder="Lesión, inasistencia…"
                className="border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setWithdrawUserId(null); setWithdrawReason("") }}
                disabled={withdrawLoading}
                className="flex-1 border border-[#e5e5e5] rounded-full py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => void withdrawParticipant()}
                disabled={withdrawLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {withdrawLoading && <RefreshCw className="size-3.5 animate-spin" />}
                Confirmar retiro
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
