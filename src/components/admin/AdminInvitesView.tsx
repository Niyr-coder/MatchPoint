"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Link2, Copy, Check, Loader2, Plus, ChevronDown, X } from "lucide-react"
import { FilterBar } from "@/components/shared/FilterBar"
import { DataTable } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import type { Column } from "@/components/shared/DataTable"
import type { InviteLinkAdmin } from "@/app/api/admin/invites/route"

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_URL = "https://matchpoint.top"

const ENTITY_TYPE_LABELS: Record<string, string> = {
  club: "Club",
  tournament: "Torneo",
  event: "Evento",
  team: "Equipo",
  platform: "Plataforma",
}

const ENTITY_TYPE_BADGE_CLASSES: Record<string, string> = {
  club: "bg-white text-[#0a0a0a] border-[#e5e5e5]",
  tournament: "bg-amber-50 text-amber-700 border-amber-200",
  event: "bg-purple-50 text-purple-700 border-purple-200",
  team: "bg-teal-50 text-teal-700 border-teal-200",
  platform: "bg-zinc-100 text-zinc-600 border-zinc-300",
}

const ENTITY_TYPE_OPTIONS = [
  { value: "club", label: "Club" },
  { value: "tournament", label: "Torneo" },
  { value: "event", label: "Evento" },
  { value: "team", label: "Equipo" },
]

const STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "revoked", label: "Revocado" },
  { value: "expired", label: "Expirado" },
  { value: "exhausted", label: "Agotado" },
]

const CREATE_ENTITY_OPTIONS = [
  { value: "club", label: "Club", placeholder: "UUID del club" },
  { value: "tournament", label: "Torneo", placeholder: "UUID del torneo" },
  { value: "event", label: "Evento", placeholder: "UUID del evento" },
  { value: "team", label: "Equipo", placeholder: "UUID del equipo" },
  { value: "platform", label: "Plataforma", placeholder: "global" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInviteStatus(invite: InviteLinkAdmin): {
  label: string
  variant: "success" | "error" | "warning" | "neutral"
} {
  if (!invite.is_active) {
    return { label: "Revocado", variant: "error" }
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { label: "Expirado", variant: "neutral" }
  }
  if (invite.max_uses !== null && invite.uses_count >= invite.max_uses) {
    return { label: "Agotado", variant: "warning" }
  }
  return { label: "Activo", variant: "success" }
}

function canRevoke(invite: InviteLinkAdmin): boolean {
  return invite.is_active
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "Sin expiración"
  return new Date(expiresAt).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// ── Create Invite Form types ──────────────────────────────────────────────────

interface CreateInviteForm {
  entity_type: string
  entity_id: string
  max_uses: string
  expires_at: string
  note: string
}

type ModalState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; invite_url: string; code: string }
  | { status: "error"; message: string }

const DEFAULT_FORM: CreateInviteForm = {
  entity_type: "club",
  entity_id: "",
  max_uses: "",
  expires_at: "",
  note: "",
}

// ── Create Invite Modal ───────────────────────────────────────────────────────

interface CreateInviteModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

function CreateInviteModal({ open, onClose, onCreated }: CreateInviteModalProps) {
  const [form, setForm] = useState<CreateInviteForm>(DEFAULT_FORM)
  const [modalState, setModalState] = useState<ModalState>({ status: "idle" })
  const [copied, setCopied] = useState(false)

  const isLoading = modalState.status === "loading"

  const selectedEntityOption =
    CREATE_ENTITY_OPTIONS.find((o) => o.value === form.entity_type) ?? CREATE_ENTITY_OPTIONS[0]

  const isPlatform = form.entity_type === "platform"

  function handleFieldChange(field: keyof CreateInviteForm, value: string) {
    setForm((prev) => {
      const updated = { ...prev, [field]: value }
      if (field === "entity_type" && value === "platform") {
        return { ...updated, entity_id: "global" }
      }
      if (field === "entity_type" && prev.entity_type === "platform") {
        return { ...updated, entity_id: "" }
      }
      return updated
    })
  }

  function handleClose() {
    if (isLoading) return
    setForm(DEFAULT_FORM)
    setModalState({ status: "idle" })
    setCopied(false)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isLoading) return

    if (!isPlatform && !form.entity_id.trim()) {
      setModalState({ status: "error", message: "El ID de entidad es requerido." })
      return
    }

    setModalState({ status: "loading" })

    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: form.entity_type,
          entity_id: isPlatform ? "global" : form.entity_id.trim(),
          max_uses: form.max_uses ? parseInt(form.max_uses, 10) : null,
          expires_at: form.expires_at ? `${form.expires_at}T23:59:59Z` : null,
          metadata: form.note ? { note: form.note } : {},
        }),
      })

      const json = (await res.json()) as {
        success: boolean
        data: { id: string; code: string; invite_url: string } | null
        error: string | null
      }

      if (!json.success || !json.data) {
        setModalState({
          status: "error",
          message: json.error ?? "No se pudo crear el invite link.",
        })
        return
      }

      const inviteUrl = json.data.invite_url || `${BASE_URL}/invite/${json.data.code}`
      setModalState({ status: "success", invite_url: inviteUrl, code: json.data.code })
      onCreated()
    } catch {
      setModalState({ status: "error", message: "Error de conexión. Intenta de nuevo." })
    }
  }

  async function handleCopy() {
    if (modalState.status !== "success") return
    try {
      await navigator.clipboard.writeText(modalState.invite_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable — non-critical
    }
  }

  function handleCreateAnother() {
    setForm(DEFAULT_FORM)
    setModalState({ status: "idle" })
    setCopied(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Crear invite link"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white border border-zinc-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <Link2 className="size-4 text-teal-700" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700">
                Admin
              </p>
              <h2 className="text-sm font-black text-[#0a0a0a] leading-none">
                Crear Invite Link
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            aria-label="Cerrar"
            className="size-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-40"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Success state */}
          {modalState.status === "success" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl bg-teal-50 border border-teal-200 px-4 py-3 flex items-center gap-2">
                <Check className="size-4 text-teal-600 shrink-0" />
                <p className="text-sm font-semibold text-teal-700">
                  Invite link creado correctamente
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                  Enlace de invitación
                </p>
                <div className="flex items-center gap-2 bg-zinc-50 rounded-xl px-3 py-2.5 border border-zinc-200">
                  <span className="text-xs font-mono text-[#0a0a0a] truncate flex-1 select-all">
                    {modalState.invite_url}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                    aria-label="Copiar enlace"
                  >
                    {copied ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCreateAnother}
                  className="flex-1 text-[11px] font-black uppercase tracking-wide px-4 py-2.5 rounded-full border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  Crear otro
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 text-[11px] font-black uppercase tracking-wide px-4 py-2.5 rounded-full bg-[#0a0a0a] text-white hover:bg-zinc-800 transition-colors"
                >
                  Listo
                </button>
              </div>
            </div>
          )}

          {/* Form state */}
          {(modalState.status === "idle" ||
            modalState.status === "loading" ||
            modalState.status === "error") && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Error banner */}
              {modalState.status === "error" && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {modalState.message}
                </div>
              )}

              {/* Entity type */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="create-entity-type"
                  className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500"
                >
                  Tipo de entidad
                </label>
                <div className="relative">
                  <select
                    id="create-entity-type"
                    value={form.entity_type}
                    onChange={(e) => handleFieldChange("entity_type", e.target.value)}
                    disabled={isLoading}
                    className="w-full appearance-none border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-[#0a0a0a] bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 disabled:opacity-60 pr-8 transition-colors"
                  >
                    {CREATE_ENTITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
                </div>
              </div>

              {/* Entity ID */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="create-entity-id"
                  className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500"
                >
                  ID de entidad
                </label>
                <input
                  id="create-entity-id"
                  type="text"
                  value={isPlatform ? "global" : form.entity_id}
                  onChange={(e) => handleFieldChange("entity_id", e.target.value)}
                  disabled={isLoading || isPlatform}
                  placeholder={selectedEntityOption.placeholder}
                  className="border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-[#0a0a0a] bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 disabled:opacity-60 disabled:bg-zinc-50 placeholder:text-zinc-400 transition-colors font-mono"
                />
              </div>

              {/* Max uses + Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="create-max-uses"
                    className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500"
                  >
                    Usos máximos
                  </label>
                  <input
                    id="create-max-uses"
                    type="number"
                    min="1"
                    value={form.max_uses}
                    onChange={(e) => handleFieldChange("max_uses", e.target.value)}
                    disabled={isLoading}
                    placeholder="Ilimitado"
                    className="border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-[#0a0a0a] bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 disabled:opacity-60 placeholder:text-zinc-400 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="create-expires-at"
                    className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500"
                  >
                    Expira el
                  </label>
                  <input
                    id="create-expires-at"
                    type="date"
                    value={form.expires_at}
                    onChange={(e) => handleFieldChange("expires_at", e.target.value)}
                    disabled={isLoading}
                    className="border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-[#0a0a0a] bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 disabled:opacity-60 transition-colors"
                  />
                </div>
              </div>

              {/* Note */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="create-note"
                  className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500"
                >
                  Nota interna{" "}
                  <span className="normal-case font-normal text-zinc-400">(opcional)</span>
                </label>
                <input
                  id="create-note"
                  type="text"
                  value={form.note}
                  onChange={(e) => handleFieldChange("note", e.target.value)}
                  disabled={isLoading}
                  placeholder="Ej: Invite para campaña de verano"
                  className="border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-[#0a0a0a] bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 disabled:opacity-60 placeholder:text-zinc-400 transition-colors"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1 text-[11px] font-black uppercase tracking-wide px-4 py-2.5 rounded-full border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wide px-4 py-2.5 rounded-full bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Link2 className="size-3.5" />
                      Crear enlace
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface AdminInvitesViewProps {
  invites: InviteLinkAdmin[]
}

export function AdminInvitesView({ invites }: AdminInvitesViewProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [filters, setFilters] = useState<Record<string, string>>({
    search: "",
    entity_type: "",
    status: "",
  })

  const [pendingRevoke, setPendingRevoke] = useState<InviteLinkAdmin | null>(null)
  const [revokeLoading, setRevokeLoading] = useState(false)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function handleCreated() {
    startTransition(() => router.refresh())
  }

  const filtered = invites.filter((invite) => {
    const search = filters.search.toLowerCase()
    const matchSearch =
      !search ||
      invite.code.toLowerCase().includes(search) ||
      (invite.creator_name ?? "").toLowerCase().includes(search) ||
      (invite.creator_email ?? "").toLowerCase().includes(search)

    const matchEntityType =
      !filters.entity_type || invite.entity_type === filters.entity_type

    const statusInfo = getInviteStatus(invite)
    const matchStatus =
      !filters.status ||
      (filters.status === "active" && statusInfo.label === "Activo") ||
      (filters.status === "revoked" && statusInfo.label === "Revocado") ||
      (filters.status === "expired" && statusInfo.label === "Expirado") ||
      (filters.status === "exhausted" && statusInfo.label === "Agotado")

    return matchSearch && matchEntityType && matchStatus
  })

  const handleRevoke = useCallback(async () => {
    if (!pendingRevoke) return
    setRevokeLoading(true)
    setRevokeError(null)
    try {
      const res = await fetch(`/api/admin/invites/${pendingRevoke.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      })
      const json: { success: boolean; error?: string | null } = await res.json()
      if (!json.success) {
        setRevokeError(json.error ?? "Error al revocar el invite")
        return
      }
      setPendingRevoke(null)
      startTransition(() => router.refresh())
    } catch {
      setRevokeError("Error de conexión. Intenta de nuevo.")
    } finally {
      setRevokeLoading(false)
    }
  }, [pendingRevoke, router, startTransition])

  const columns: Column<InviteLinkAdmin>[] = [
    {
      key: "code",
      header: "Código",
      render: (invite) => (
        <span className="font-mono text-xs font-bold text-[#0a0a0a] bg-zinc-100 px-2 py-0.5 rounded-lg tracking-wider">
          {invite.code}
        </span>
      ),
    },
    {
      key: "entity_type",
      header: "Tipo",
      render: (invite) => {
        const classes =
          ENTITY_TYPE_BADGE_CLASSES[invite.entity_type] ??
          "bg-zinc-100 text-zinc-500 border-zinc-200"
        const label = ENTITY_TYPE_LABELS[invite.entity_type] ?? invite.entity_type
        return (
          <span
            className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${classes}`}
          >
            {label}
          </span>
        )
      },
    },
    {
      key: "entity_id",
      header: "Entidad",
      render: (invite) => (
        <span className="font-mono text-xs text-zinc-500">
          {invite.entity_id === "global"
            ? "global"
            : `${invite.entity_id.slice(0, 8)}…`}
        </span>
      ),
    },
    {
      key: "creator_name",
      header: "Creado por",
      render: (invite) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-[#0a0a0a]">
            {invite.creator_name ?? "—"}
          </span>
          {invite.creator_email && (
            <span className="text-[11px] text-zinc-400">{invite.creator_email}</span>
          )}
        </div>
      ),
    },
    {
      key: "uses",
      header: "Usos",
      render: (invite) => (
        <span className="text-sm font-semibold">
          {invite.uses_count}
          <span className="text-zinc-400 font-normal">
            /{invite.max_uses !== null ? invite.max_uses : "∞"}
          </span>
        </span>
      ),
    },
    {
      key: "expires_at",
      header: "Expiración",
      render: (invite) => (
        <span className="text-sm text-zinc-500">{formatExpiry(invite.expires_at)}</span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (invite) => {
        const { label, variant } = getInviteStatus(invite)
        return <StatusBadge label={label} variant={variant} />
      },
    },
    {
      key: "actions",
      header: "Acciones",
      render: (invite) =>
        canRevoke(invite) ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setRevokeError(null)
              setPendingRevoke(invite)
            }}
            className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
          >
            Revocar
          </button>
        ) : (
          <span className="text-[11px] text-zinc-300 font-bold uppercase tracking-wide">
            —
          </span>
        ),
    },
  ]

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <FilterBar
              searchPlaceholder="Buscar por código o creador..."
              filters={[
                {
                  key: "entity_type",
                  label: "Todos los tipos",
                  options: ENTITY_TYPE_OPTIONS,
                },
                {
                  key: "status",
                  label: "Todos los estados",
                  options: STATUS_OPTIONS,
                },
              ]}
              values={filters}
              onFilterChange={handleFilterChange}
            />
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="shrink-0 flex items-center gap-2 bg-[#0a0a0a] text-white rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wide hover:bg-zinc-800 transition-colors"
          >
            <Plus className="size-3.5" />
            Crear invitación
          </button>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No se encontraron invite links"
          keyExtractor={(invite) => invite.id}
        />

        {revokeError && !pendingRevoke && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {revokeError}
          </div>
        )}

        <ConfirmDialog
          open={pendingRevoke !== null}
          onOpenChange={(open) => {
            if (!open && !revokeLoading) setPendingRevoke(null)
          }}
          title="¿Revocar invite link?"
          description={
            pendingRevoke
              ? `El código "${pendingRevoke.code}" quedará inactivo. Los usuarios que ya lo usaron no se verán afectados, pero no podrá usarse nuevamente.`
              : ""
          }
          confirmLabel="Revocar"
          variant="danger"
          loading={revokeLoading}
          onConfirm={handleRevoke}
        />
      </div>

      <CreateInviteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </>
  )
}
