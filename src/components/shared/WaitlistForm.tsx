"use client"

import { useState } from "react"
import { ArrowRight, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { waitlistSchema } from "@/lib/validations"

type Status = "idle" | "loading" | "success" | "error"

export function WaitlistForm() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = waitlistSchema.safeParse({ email })
    if (!result.success) {
      setStatus("error")
      setMessage(result.error.issues[0].message)
      return
    }

    setStatus("loading")
    setMessage("")

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing_page" }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setStatus("error")
        setMessage(data.error ?? "Algo salió mal. Intenta de nuevo.")
        return
      }

      setStatus("success")
      setMessage("¡Estás en lista! Te notificaremos cuando lancemos.")
      setEmail("")
    } catch {
      setStatus("error")
      setMessage("Error de conexión. Intenta de nuevo.")
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-full px-6 py-4 text-primary">
        <CheckCircle className="w-5 h-5 shrink-0" />
        <p className="text-sm font-semibold">{message}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="flex gap-2 p-1.5 bg-card/10 rounded-full border border-white/15">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
          disabled={status === "loading"}
          className="flex-1 bg-transparent text-white placeholder:text-white/40 text-sm px-4 outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-pill bg-card text-foreground px-6 py-2.5 text-xs shrink-0 disabled:opacity-60"
        >
          {status === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Registrarme <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {status === "error" && (
        <div className="flex items-center gap-2 mt-3 text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <p className="text-xs">{message}</p>
        </div>
      )}

      <p className="text-xs text-white/30 mt-3 text-center">
        Sin spam. Sin tarjeta. Cancela cuando quieras.
      </p>
    </form>
  )
}
