"use client"

import { useState } from "react"
import { BadgeCheck } from "lucide-react"
import { OriginBadge } from "@/components/admin/user-detail/OriginBadge"
import { formatDate } from "@/components/admin/user-detail/helpers"
import type { UserAdmin } from "@/lib/admin/queries"

interface VerificationSectionProps {
  user: UserAdmin
  onVerified: () => void
}

export function VerificationSection({ user, onVerified }: VerificationSectionProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify" }),
      })
      const json = (await res.json()) as { success: boolean; error?: string | null }
      if (!json.success) { setError(json.error ?? "Error al verificar"); return }
      onVerified()
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <BadgeCheck className="size-3.5 text-zinc-400 shrink-0" />
        <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400">Verificación</p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-zinc-500">Estado</span>
          {user.is_verified ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              <BadgeCheck className="size-3" />Verificado
            </span>
          ) : (
            <span className="text-[11px] font-bold text-zinc-400 bg-muted border border-zinc-200 rounded-full px-2 py-0.5">
              No verificado
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-zinc-500">Origen</span>
          <OriginBadge origin={user.account_origin} />
        </div>
        {user.verified_at && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-zinc-500">Verificado el</span>
            <span className="text-[11px] text-zinc-700">{formatDate(user.verified_at)}</span>
          </div>
        )}
      </div>

      {!user.is_verified && (
        <>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-100">{error}</p>}
          <button
            onClick={() => void handleVerify()}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 w-full border border-green-200 text-green-700 rounded-full py-2 text-[11px] font-bold hover:bg-green-50 transition-colors disabled:opacity-50"
          >
            {loading ? "Verificando…" : <><BadgeCheck className="size-3.5" />Verificar manualmente</>}
          </button>
        </>
      )}
    </div>
  )
}
