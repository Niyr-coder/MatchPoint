"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { JoinPreview } from "../join-preview"

interface JoinPageClientProps {
  preview: JoinPreview
  isAuthenticated: boolean
}

type State = "idle" | "loading" | "success" | "error"

const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  expired:   { title: "Enlace expirado",         body: "Este enlace ya no es válido." },
  inactive:  { title: "Invitación desactivada", body: "El creador desactivó este enlace." },
  exhausted: { title: "Sin cupos disponibles",  body: "Este enlace alcanzó su límite de usos." },
  not_found: { title: "Invitación no encontrada", body: "El enlace no existe o fue eliminado." },
}

export function JoinPageClient({ preview, isAuthenticated }: JoinPageClientProps) {
  const router = useRouter()
  const [state, setState] = useState<State>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { entity, status, code, entity_type } = preview
  const terminal = STATUS_MESSAGES[status]

  async function handleJoin() {
    setState("loading")
    try {
      const res = await fetch("/api/invites/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setErrorMsg(json.error ?? "Error al procesar la invitación.")
        setState("error")
        return
      }
      setState("success")
      setTimeout(() => router.push("/dashboard"), 1500)
    } catch {
      setErrorMsg("Error de conexión. Intenta de nuevo.")
      setState("error")
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-border shadow-sm">
        {/* Hero */}
        <div
          className="h-28 flex items-end px-5 py-4 relative"
          style={{ background: entity.gradient }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1 block">
              {entity_type.replace("_", " ")}
            </span>
            <h1 className="text-xl font-black text-white leading-tight">{entity.name}</h1>
            {entity.subtitle && (
              <p className="text-xs text-white/70 mt-0.5">{entity.subtitle}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        {entity.stats.length > 0 && (
          <div className="flex divide-x divide-border border-b border-border">
            {entity.stats.map((s) => (
              <div key={s.label} className="flex-1 py-3 text-center">
                <p className="text-sm font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 bg-card">
          {entity.description && (
            <p className="text-sm text-zinc-500 leading-relaxed">{entity.description}</p>
          )}

          {/* Terminal states */}
          {terminal ? (
            <div className="rounded-lg bg-zinc-100 px-4 py-3 text-center">
              <p className="text-sm font-bold text-zinc-700">{terminal.title}</p>
              <p className="text-xs text-zinc-400 mt-1">{terminal.body}</p>
            </div>
          ) : !isAuthenticated ? (
            <Link
              href={`/login?next=/join/${code}`}
              className="block w-full rounded-xl bg-foreground py-3 text-center text-sm font-bold text-white hover:bg-zinc-800 transition-colors"
            >
              Iniciar sesión para unirte
            </Link>
          ) : state === "success" ? (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-center">
              <p className="text-sm font-bold text-green-700">¡Te has unido exitosamente!</p>
              <p className="text-xs text-green-500 mt-1">Redirigiendo al dashboard…</p>
            </div>
          ) : state === "error" ? (
            <div className="flex flex-col gap-2">
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-center">
                <p className="text-xs text-red-600">{errorMsg}</p>
              </div>
              <button
                onClick={() => setState("idle")}
                className="text-xs text-zinc-400 underline"
              >
                Intentar de nuevo
              </button>
            </div>
          ) : (
            <button
              onClick={handleJoin}
              disabled={state === "loading"}
              className="w-full rounded-xl bg-foreground py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-colors disabled:opacity-60"
            >
              {state === "loading" ? "Procesando…" : entity.cta_text}
            </button>
          )}

          {entity.cta_sub && state === "idle" && (
            <p className="text-[11px] text-zinc-400 text-center">{entity.cta_sub}</p>
          )}
        </div>
      </div>
    </div>
  )
}
