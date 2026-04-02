"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle2, XCircle, LogIn } from "lucide-react"
import type { InviteEntityType } from "@/lib/invites/join-handlers"

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface InviteRedeemClientProps {
  code: string
  isAuthenticated: boolean
  isExpired: boolean
  isInactive: boolean
  entityType: InviteEntityType | null
}

type RedeemState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; entityType: InviteEntityType; entityId: string; message: string }
  | { status: "error"; message: string }

// ──────────────────────────────────────────────────────────────────────────────
// Navigation destinations per entity type after a successful redeem
// ──────────────────────────────────────────────────────────────────────────────

function buildDestinationHref(entityType: InviteEntityType, entityId: string): string {
  switch (entityType) {
    case "club":
      return `/dashboard`
    case "tournament":
      return `/dashboard`
    case "team":
      return `/dashboard`
    case "event":
      return `/dashboard`
    case "coach_class":
      return `/dashboard`
    case "reservation":
      return `/dashboard`
    default:
      return `/dashboard`
  }
}

const DESTINATION_LABELS: Record<InviteEntityType, string> = {
  club:        "Ir al dashboard",
  tournament:  "Ir al dashboard",
  team:        "Ir al dashboard",
  event:       "Ir al dashboard",
  coach_class: "Ir al dashboard",
  reservation: "Ir al dashboard",
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export function InviteRedeemClient({
  code,
  isAuthenticated,
  isExpired,
  isInactive,
  entityType,
}: InviteRedeemClientProps) {
  const router = useRouter()
  const [state, setState] = useState<RedeemState>({ status: "idle" })

  // Terminal error states — show a static message, no CTA
  if (isExpired) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <XCircle className="size-10 text-red-400" />
        <p className="text-sm font-semibold text-[#0a0a0a]">Invitación expirada</p>
        <p className="text-xs text-zinc-500 text-center">
          Este link de invitación ya no es válido porque ha superado su fecha límite.
        </p>
      </div>
    )
  }

  if (isInactive) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <XCircle className="size-10 text-zinc-300" />
        <p className="text-sm font-semibold text-[#0a0a0a]">Invitación desactivada</p>
        <p className="text-xs text-zinc-500 text-center">
          El creador de esta invitación la ha revocado. Contacta a quien te la envió.
        </p>
      </div>
    )
  }

  // Not authenticated — prompt login
  if (!isAuthenticated) {
    const loginHref = `/login?next=/invite/${encodeURIComponent(code)}`

    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-zinc-500 text-center">
          Necesitas una cuenta para aceptar esta invitación.
        </p>
        <a
          href={loginHref}
          className="flex items-center justify-center gap-2 w-full bg-[#0a0a0a] hover:bg-[#1a1a1a] text-white font-bold text-sm rounded-full px-6 py-3.5 transition-colors"
        >
          <LogIn className="size-4" />
          Inicia sesión para unirte
        </a>
      </div>
    )
  }

  // Success state
  if (state.status === "success") {
    const href = buildDestinationHref(state.entityType, state.entityId)
    const label = DESTINATION_LABELS[state.entityType]

    return (
      <div className="flex flex-col items-center gap-4">
        <CheckCircle2 className="size-12 text-[#16a34a]" />
        <div className="text-center">
          <p className="text-sm font-bold text-[#0a0a0a]">Te has unido exitosamente</p>
          <p className="text-xs text-zinc-500 mt-1">{state.message}</p>
        </div>
        <a
          href={href}
          className="flex items-center justify-center w-full bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-sm rounded-full px-6 py-3.5 transition-colors"
        >
          {label}
        </a>
      </div>
    )
  }

  // Error state
  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center gap-4">
        <XCircle className="size-10 text-red-400" />
        <div className="text-center">
          <p className="text-sm font-semibold text-[#0a0a0a]">No se pudo procesar</p>
          <p className="text-xs text-zinc-500 mt-1">{state.message}</p>
        </div>
        <button
          onClick={() => setState({ status: "idle" })}
          className="text-xs text-[#16a34a] font-semibold hover:underline"
        >
          Intentar de nuevo
        </button>
      </div>
    )
  }

  // Idle / loading — main CTA
  const isLoading = state.status === "loading"

  const handleRedeem = async () => {
    setState({ status: "loading" })

    try {
      const response = await fetch("/api/invites/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })

      const json = await response.json() as {
        success: boolean
        data: { entity_type: InviteEntityType; entity_id: string; message: string } | null
        error: string | null
      }

      if (!json.success || !json.data) {
        setState({
          status: "error",
          message: json.error ?? "Ocurrió un error inesperado. Intenta de nuevo.",
        })
        return
      }

      setState({
        status: "success",
        entityType: json.data.entity_type,
        entityId: json.data.entity_id,
        message: json.data.message,
      })
    } catch {
      setState({
        status: "error",
        message: "No se pudo conectar con el servidor. Verifica tu conexión.",
      })
    }
  }

  return (
    <button
      onClick={handleRedeem}
      disabled={isLoading}
      className="flex items-center justify-center gap-2 w-full bg-[#0a0a0a] hover:bg-[#1a1a1a] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-full px-6 py-3.5 transition-colors"
    >
      {isLoading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Procesando...
        </>
      ) : (
        "Unirse ahora"
      )}
    </button>
  )
}
