"use client"

import { useState } from "react"
import { Link2, Copy, Check, Loader2, ChevronDown, X } from "lucide-react"

const BASE_URL = "https://matchpoint.top"

const CREATE_ENTITY_OPTIONS = [
  { value: "club", label: "Club", placeholder: "UUID del club" },
  { value: "tournament", label: "Torneo", placeholder: "UUID del torneo" },
  { value: "event", label: "Evento", placeholder: "UUID del evento" },
  { value: "team", label: "Equipo", placeholder: "UUID del equipo" },
  { value: "platform", label: "Plataforma", placeholder: "global" },
]

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

interface AdminCreateInviteModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function AdminCreateInviteModal({ open, onClose, onCreated }: AdminCreateInviteModalProps) {
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
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <Link2 className="size-4 text-teal-700" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700">
                Admin
              </p>
              <h2 className="text-sm font-black text-foreground leading-none">
                Crear Invite Link
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            aria-label="Cerrar"
            className="size-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-muted transition-colors disabled:opacity-40"
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
                <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5 border border-border">
                  <span className="text-xs font-mono text-foreground truncate flex-1 select-all">
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
                  className="flex-1 text-[11px] font-black uppercase tracking-wide px-4 py-2.5 rounded-full border border-border text-zinc-600 hover:bg-secondary transition-colors"
                >
                  Crear otro
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 text-[11px] font-black uppercase tracking-wide px-4 py-2.5 rounded-full bg-foreground text-white hover:bg-foreground/90 transition-colors"
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
                    className="w-full appearance-none border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 disabled:opacity-60 pr-8 transition-colors"
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
                  className="border border-border rounded-xl px-3 py-2.5 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 disabled:opacity-60 disabled:bg-muted placeholder:text-zinc-400 transition-colors font-mono"
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
                    className="border border-border rounded-xl px-3 py-2.5 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 disabled:opacity-60 placeholder:text-zinc-400 transition-colors"
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
                    className="border border-border rounded-xl px-3 py-2.5 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 disabled:opacity-60 transition-colors"
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
                  className="border border-border rounded-xl px-3 py-2.5 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 disabled:opacity-60 placeholder:text-zinc-400 transition-colors"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1 text-[11px] font-black uppercase tracking-wide px-4 py-2.5 rounded-full border border-border text-zinc-600 hover:bg-secondary transition-colors disabled:opacity-40"
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
