"use client"

import { useState } from "react"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import type { InviteEntityType } from "@/features/memberships/actions"

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface InviteRedeemButtonProps {
  code: string
  onSuccess?: (result: { entity_type: InviteEntityType; entity_id: string }) => void
  onError?: (message: string) => void
}

type ButtonState = "idle" | "loading" | "success" | "error"

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export function InviteRedeemButton({
  code,
  onSuccess,
  onError,
}: InviteRedeemButtonProps) {
  const [buttonState, setButtonState] = useState<ButtonState>("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")

  const handleRedeem = async () => {
    if (buttonState === "loading" || buttonState === "success") return

    setButtonState("loading")
    setErrorMessage("")

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
        const message = json.error ?? "Error al procesar la invitación."
        setButtonState("error")
        setErrorMessage(message)
        onError?.(message)
        return
      }

      setButtonState("success")
      onSuccess?.({
        entity_type: json.data.entity_type,
        entity_id:   json.data.entity_id,
      })
    } catch {
      const message = "No se pudo conectar con el servidor."
      setButtonState("error")
      setErrorMessage(message)
      onError?.(message)
    }
  }

  const handleRetry = () => {
    setButtonState("idle")
    setErrorMessage("")
  }

  if (buttonState === "success") {
    return (
      <button
        disabled
        className="flex items-center gap-2 bg-[#16a34a] text-white font-bold text-sm rounded-full px-6 py-3 opacity-100 cursor-default"
      >
        <CheckCircle2 className="size-4" />
        Unido correctamente
      </button>
    )
  }

  if (buttonState === "error") {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          disabled
          className="flex items-center gap-2 bg-red-100 text-red-600 font-bold text-sm rounded-full px-6 py-3 cursor-default"
        >
          <XCircle className="size-4" />
          Error al unirse
        </button>
        <p className="text-[11px] text-red-500 pl-1">{errorMessage}</p>
        <button
          onClick={handleRetry}
          className="text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors pl-1 text-left"
        >
          Intentar de nuevo
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleRedeem}
      disabled={buttonState === "loading"}
      className="flex items-center gap-2 bg-foreground hover:bg-[#1a1a1a] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-full px-6 py-3 transition-colors"
    >
      {buttonState === "loading" ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Procesando...
        </>
      ) : (
        "Unirse"
      )}
    </button>
  )
}
