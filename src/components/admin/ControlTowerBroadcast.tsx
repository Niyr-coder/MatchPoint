"use client"

import { useState, useTransition } from "react"
import { Bell, Send, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type State = "idle" | "sending" | "done" | "error"

export function ControlTowerBroadcast() {
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [state, setState] = useState<State>("idle")
  const [sentTo, setSentTo] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canSend = title.trim().length > 0 && message.trim().length > 0

  const send = () => {
    if (!canSend) return
    setErrorMsg(null)
    setState("sending")
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), message: message.trim(), target: "all" }),
        })
        const json = await res.json() as { success: boolean; data?: { sent_to: number }; error?: string }
        if (!json.success) { setState("error"); setErrorMsg(json.error ?? "Error"); return }
        setSentTo(json.data?.sent_to ?? 0)
        setState("done")
        setTitle("")
        setMessage("")
        setTimeout(() => setState("idle"), 4000)
      } catch {
        setState("error")
        setErrorMsg("Error de red")
      }
    })
  }

  return (
    <div className="rounded-2xl bg-card border border-border flex flex-col overflow-hidden h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <Bell className="size-3.5 text-amber-500" />
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
          Broadcast global
        </p>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-3">
        {state === "done" ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 py-4">
            <CheckCircle className="size-6 text-emerald-500" />
            <p className="text-xs font-black text-emerald-600 uppercase tracking-wide">Enviado</p>
            <p className="text-[10px] text-zinc-400 text-center">
              Notificación enviada a <strong>{sentTo}</strong> usuario{sentTo !== 1 ? "s" : ""}
            </p>
          </div>
        ) : (
          <>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1">
                Título
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="Ej: Mantenimiento programado"
                className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-2 text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-zinc-300 transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1">
                Mensaje
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Mensaje que recibirán todos los usuarios…"
                className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-2 text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-zinc-300 transition-colors resize-none"
              />
            </div>

            {errorMsg && (
              <p className="text-[10px] text-red-500">{errorMsg}</p>
            )}

            <button
              onClick={send}
              disabled={!canSend || isPending}
              className={cn(
                "flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                canSend && !isPending
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-muted text-zinc-400 cursor-not-allowed"
              )}
            >
              <Send className="size-3" />
              {isPending ? "Enviando…" : "Enviar a todos"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
