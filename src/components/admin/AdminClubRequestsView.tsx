"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { X, ChevronRight, Loader2, MapPin, Phone, Mail, Calendar } from "lucide-react"
import type { ClubRequestAdmin } from "@/lib/admin/queries"

// ── Types ─────────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "pending" | "approved" | "rejected"

interface AdminClubRequestsViewProps {
  requests: ClubRequestAdmin[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "approved", label: "Aprobadas" },
  { value: "rejected", label: "Rechazadas" },
]

const SPORT_LABELS: Record<string, string> = {
  futbol: "Fútbol ⚽",
  padel: "Pádel 🏓",
  tenis: "Tenis 🎾",
  pickleball: "Pickleball 🏸",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function StatusBadge({ status }: { status: ClubRequestAdmin["status"] }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-50 text-amber-700">
        En revisión
      </span>
    )
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-green-50 text-green-700">
        Aprobada
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-red-50 text-red-700">
      Rechazada
    </span>
  )
}

function SportPills({ sports }: { sports: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {sports.map((s) => (
        <span
          key={s}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600"
        >
          {SPORT_LABELS[s] ?? s}
        </span>
      ))}
    </div>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────

interface DetailPanelProps {
  request: ClubRequestAdmin
  onClose: () => void
  onApprove: (id: string) => Promise<void>
  onReject: (id: string, notes: string) => Promise<void>
  isActioning: boolean
}

function DetailPanel({ request, onClose, onApprove, onReject, isActioning }: DetailPanelProps) {
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectNotes, setRejectNotes] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleApprove() {
    setActionError(null)
    try {
      await onApprove(request.id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error desconocido")
    }
  }

  async function handleReject() {
    setActionError(null)
    try {
      await onReject(request.id, rejectNotes)
      setShowRejectForm(false)
      setRejectNotes("")
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error desconocido")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-[#e5e5e5]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-0.5">
              Solicitud de club
            </p>
            <h2 className="text-lg font-black text-[#0a0a0a] tracking-[-0.02em]">
              {request.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors shrink-0 mt-0.5"
            aria-label="Cerrar panel"
          >
            <X className="size-4 text-zinc-600" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 flex flex-col gap-5">
          {/* Status */}
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status} />
            <span className="text-xs text-zinc-400">{formatDate(request.created_at)}</span>
          </div>

          {/* Requester */}
          <div className="rounded-xl bg-zinc-50 p-4 flex flex-col gap-1">
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-1">
              Solicitante
            </p>
            <p className="text-sm font-bold text-[#0a0a0a]">
              {request.requester_name ?? <span className="italic text-zinc-400">Sin nombre</span>}
            </p>
            {request.requester_username && (
              <p className="text-xs text-zinc-500">@{request.requester_username}</p>
            )}
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">
              Ubicación
            </p>
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <MapPin className="size-4 shrink-0 text-zinc-400" />
              <span>{request.city}, {request.province}</span>
            </div>
          </div>

          {/* Sports */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">
              Deportes
            </p>
            <SportPills sports={request.sports} />
          </div>

          {/* Description */}
          {request.description && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">
                Descripción
              </p>
              <p className="text-sm text-zinc-600 leading-relaxed">{request.description}</p>
            </div>
          )}

          {/* Contact */}
          {(request.contact_phone || request.contact_email) && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">
                Contacto
              </p>
              {request.contact_phone && (
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Phone className="size-4 shrink-0 text-zinc-400" />
                  <span>{request.contact_phone}</span>
                </div>
              )}
              {request.contact_email && (
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Mail className="size-4 shrink-0 text-zinc-400" />
                  <span>{request.contact_email}</span>
                </div>
              )}
            </div>
          )}

          {/* Admin notes (if reviewed) */}
          {request.admin_notes && (
            <div className="rounded-xl bg-zinc-50 border border-[#e5e5e5] p-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-1">
                Notas del admin
              </p>
              <p className="text-sm text-zinc-600">{request.admin_notes}</p>
            </div>
          )}

          {request.reviewed_at && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Calendar className="size-3.5" />
              <span>Revisada el {formatDate(request.reviewed_at)}</span>
            </div>
          )}

          {/* Action error */}
          {actionError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {actionError}
            </p>
          )}

          {/* Actions — only for pending */}
          {request.status === "pending" && (
            <div className="flex flex-col gap-3 pt-2">
              {!showRejectForm ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={isActioning}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-foreground text-background text-sm font-black uppercase tracking-wide hover:bg-foreground-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isActioning && <Loader2 className="size-4 animate-spin" />}
                    Aprobar
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={isActioning}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-red-200 text-red-600 text-sm font-black uppercase tracking-wide hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Rechazar
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                      Motivo del rechazo
                      <span className="ml-1.5 font-medium normal-case text-zinc-400">(opcional)</span>
                    </label>
                    <textarea
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="Explica al solicitante por qué fue rechazada..."
                      rows={3}
                      className="border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#0a0a0a] placeholder:text-zinc-400 outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleReject}
                      disabled={isActioning}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-red-600 text-white text-sm font-black uppercase tracking-wide hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isActioning && <Loader2 className="size-4 animate-spin" />}
                      Confirmar rechazo
                    </button>
                    <button
                      onClick={() => { setShowRejectForm(false); setRejectNotes("") }}
                      disabled={isActioning}
                      className="px-4 py-3 rounded-full border border-[#e5e5e5] text-zinc-600 text-sm font-bold hover:bg-zinc-50 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminClubRequestsView({ requests }: AdminClubRequestsViewProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [selectedRequest, setSelectedRequest] = useState<ClubRequestAdmin | null>(null)
  const [isActioning, setIsActioning] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const filtered = requests.filter((r) =>
    statusFilter === "all" ? true : r.status === statusFilter
  )

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  }

  async function handleApprove(id: string) {
    setIsActioning(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/club-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      })
      const json: { success: boolean; error?: string | null } = await res.json()
      if (!json.success) throw new Error(json.error ?? "Error al aprobar")
      setSelectedRequest(null)
      startTransition(() => router.refresh())
    } catch (err) {
      throw err
    } finally {
      setIsActioning(false)
    }
  }

  async function handleReject(id: string, adminNotes: string) {
    setIsActioning(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/club-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", adminNotes: adminNotes || null }),
      })
      const json: { success: boolean; error?: string | null } = await res.json()
      if (!json.success) throw new Error(json.error ?? "Error al rechazar")
      setSelectedRequest(null)
      startTransition(() => router.refresh())
    } catch (err) {
      throw err
    } finally {
      setIsActioning(false)
    }
  }

  return (
    <>
      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors ${
              statusFilter === f.value
                ? "bg-foreground text-background"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {f.label}
            <span
              className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                statusFilter === f.value ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-500"
              }`}
            >
              {counts[f.value]}
            </span>
          </button>
        ))}
      </div>

      {/* Global action error */}
      {actionError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          {actionError}
        </p>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-14">
          <p className="text-sm font-bold text-zinc-400">
            {statusFilter === "all"
              ? "No hay solicitudes aún"
              : `No hay solicitudes ${statusFilter === "pending" ? "pendientes" : statusFilter === "approved" ? "aprobadas" : "rechazadas"}`}
          </p>
        </div>
      ) : (
        <>
          {/* Header row */}
          <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_auto] gap-3 pb-2 border-b border-[#f0f0f0] mb-1 px-1">
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Solicitante</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Club</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Ciudad / Provincia</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Deportes</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Estado</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 text-right">Fecha</p>
          </div>

          {/* Data rows */}
          <div className="flex flex-col divide-y divide-[#f0f0f0]">
            {filtered.map((req) => (
              <div
                key={req.id}
                onClick={() => setSelectedRequest(req)}
                className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_auto] gap-3 py-3.5 px-1 items-center cursor-pointer hover:bg-zinc-50 transition-colors rounded-lg"
              >
                {/* Requester */}
                <div>
                  <p className="text-sm font-bold text-[#0a0a0a]">
                    {req.requester_name ?? <span className="italic text-zinc-400">Sin nombre</span>}
                  </p>
                  {req.requester_username && (
                    <p className="text-[10px] text-zinc-400">@{req.requester_username}</p>
                  )}
                </div>

                {/* Club name */}
                <p className="text-sm font-semibold text-zinc-700 truncate">{req.name}</p>

                {/* Location */}
                <p className="text-xs text-zinc-500">
                  {req.city}
                  <span className="text-zinc-300 mx-1">/</span>
                  {req.province}
                </p>

                {/* Sports */}
                <div className="flex flex-wrap gap-1">
                  {req.sports.slice(0, 2).map((s) => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
                      {SPORT_LABELS[s]?.split(" ")[1] ?? s}
                    </span>
                  ))}
                  {req.sports.length > 2 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-400 font-medium">
                      +{req.sports.length - 2}
                    </span>
                  )}
                </div>

                {/* Status */}
                <StatusBadge status={req.status} />

                {/* Date + chevron */}
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-xs text-zinc-400">{formatDate(req.created_at)}</p>
                  <ChevronRight className="size-4 text-zinc-300" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Detail panel */}
      {selectedRequest && (
        <DetailPanel
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          isActioning={isActioning}
        />
      )}
    </>
  )
}
