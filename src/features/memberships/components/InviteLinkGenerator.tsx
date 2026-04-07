"use client"

import { useState } from "react"
import { Link2, Copy, Check, Loader2, ChevronDown } from "lucide-react"
import type { InviteEntityType } from "@/features/memberships/actions"

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface InviteLinkGeneratorProps {
  entityType: InviteEntityType
  entityId: string
  label?: string
}

type GeneratorState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "generated"; url: string }
  | { status: "error"; message: string }

// ──────────────────────────────────────────────────────────────────────────────
// Options config
// ──────────────────────────────────────────────────────────────────────────────

const MAX_USES_OPTIONS = [
  { value: "",   label: "Sin límite" },
  { value: "1",  label: "1 uso" },
  { value: "5",  label: "5 usos" },
  { value: "10", label: "10 usos" },
  { value: "25", label: "25 usos" },
] as const

const EXPIRES_OPTIONS = [
  { value: "",   label: "Sin expiración" },
  { value: "1",  label: "1 día" },
  { value: "7",  label: "7 días" },
  { value: "30", label: "30 días" },
] as const

const BASE_URL = "https://matchpoint.top"

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────name──────────────────────────────────────────────

function buildExpiresAt(daysStr: string): string | undefined {
  if (!daysStr) return undefined
  const days = parseInt(daysStr, 10)
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  return date.toISOString()
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export function InviteLinkGenerator({
  entityType,
  entityId,
  label = "Generar link de invitación",
}: InviteLinkGeneratorProps) {
  const [state, setState] = useState<GeneratorState>({ status: "idle" })
  const [maxUses, setMaxUses] = useState<string>("")
  const [expiresDays, setExpiresDays] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  const isLoading = state.status === "loading"

  const handleGenerate = async () => {
    setState({ status: "loading" })

    const body: Record<string, unknown> = {
      entity_type: entityType,
      entity_id:   entityId,
    }

    if (maxUses) {
      body.max_uses = parseInt(maxUses, 10)
    }

    const expiresAt = buildExpiresAt(expiresDays)
    if (expiresAt) {
      body.expires_at = expiresAt
    }

    try {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const json = await response.json() as {
        success: boolean
        data: { code: string } | null
        error: string | null
      }

      if (!json.success || !json.data) {
        setState({
          status: "error",
          message: json.error ?? "No se pudo generar el link. Intenta de nuevo.",
        })
        return
      }

      const url = `${BASE_URL}/invite/${json.data.code}`
      setState({ status: "generated", url })
    } catch {
      setState({
        status: "error",
        message: "No se pudo conectar con el servidor.",
      })
    }
  }

  const handleCopy = async () => {
    if (state.status !== "generated") return
    try {
      await navigator.clipboard.writeText(state.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select the text manually — not critical
    }
  }

  const handleReset = () => {
    setState({ status: "idle" })
    setCopied(false)
  }

  // ── Generated state ──────────────────────────────────────────────────────
  if (state.status === "generated") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 bg-[#f5f5f5] rounded-xl px-3 py-2.5 border border-[#e5e5e5]">
          <Link2 className="size-4 text-zinc-400 shrink-0" />
          <span className="text-xs text-[#0a0a0a] font-mono truncate flex-1 select-all">
            {state.url}
          </span>
          <button
            onClick={handleCopy}
            className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-[#16a34a] hover:text-[#15803d] transition-colors"
            aria-label="Copiar link"
          >
            {copied ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
        <button
          onClick={handleReset}
          className="text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors text-center"
        >
          Generar otro link
        </button>
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (state.status === "error") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-red-500">{state.message}</p>
        <button
          onClick={handleReset}
          className="text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>
    )
  }

  // ── Idle / loading ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      {/* Options toggle */}
      <button
        type="button"
        onClick={() => setShowOptions((v) => !v)}
        className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors self-start"
        disabled={isLoading}
      >
        <ChevronDown
          className={`size-3.5 transition-transform ${showOptions ? "rotate-180" : ""}`}
        />
        Opciones avanzadas
      </button>

      {showOptions && (
        <div className="grid grid-cols-2 gap-3">
          {/* Max uses */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Usos máximos
            </label>
            <div className="relative">
              <select
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                disabled={isLoading}
                className="w-full appearance-none border border-[#e5e5e5] rounded-lg px-3 py-2 text-xs text-[#0a0a0a] bg-white focus:outline-none focus:ring-2 focus:ring-[#16a34a] disabled:opacity-60 pr-7"
              >
                {MAX_USES_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
            </div>
          </div>

          {/* Expiry */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Expiración
            </label>
            <div className="relative">
              <select
                value={expiresDays}
                onChange={(e) => setExpiresDays(e.target.value)}
                disabled={isLoading}
                className="w-full appearance-none border border-[#e5e5e5] rounded-lg px-3 py-2 text-xs text-[#0a0a0a] bg-white focus:outline-none focus:ring-2 focus:ring-[#16a34a] disabled:opacity-60 pr-7"
              >
                {EXPIRES_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
            </div>
          </div>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={isLoading}
        className="flex items-center justify-center gap-2 w-full bg-[#0a0a0a] hover:bg-[#1a1a1a] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-full px-6 py-3 transition-colors"
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Generando...
          </>
        ) : (
          <>
            <Link2 className="size-4" />
            {label}
          </>
        )}
      </button>
    </div>
  )
}
