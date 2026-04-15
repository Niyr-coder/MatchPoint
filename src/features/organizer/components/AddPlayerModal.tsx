"use client"

import { useState, useRef } from "react"
import { X, Search, UserPlus } from "lucide-react"

interface RegisteredUser {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

interface AddPlayerModalProps {
  quedadaId: string
  onClose: () => void
  onAdded: () => void
}

const inputCls =
  "w-full px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground placeholder:text-zinc-300 focus:outline-none focus:border-foreground transition-colors bg-card"

export function AddPlayerModal({ quedadaId, onClose, onAdded }: AddPlayerModalProps) {
  const [tab, setTab] = useState<"registered" | "guest">("registered")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<RegisteredUser[]>([])
  const [searching, setSearching] = useState(false)
  const [guestName, setGuestName] = useState("")
  const [guestLastname, setGuestLastname] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleQueryChange(value: string) {
    setQuery(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (value.length < 2) {
      setResults([])
      return
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(value)}`)
        const json = (await res.json()) as { success: boolean; data?: RegisteredUser[] }
        if (json.success) setResults(json.data ?? [])
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  async function addRegistered(userId: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tournaments/${quedadaId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "registered", userId }),
      })
      const json = (await res.json()) as { success: boolean; error?: string }
      if (!json.success) throw new Error(json.error ?? "Error al agregar")
      onAdded()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  async function addGuest() {
    if (!guestName.trim() || !guestLastname.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tournaments/${quedadaId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "guest",
          guestName: guestName.trim(),
          guestLastname: guestLastname.trim(),
        }),
      })
      const json = (await res.json()) as { success: boolean; error?: string }
      if (!json.success) throw new Error(json.error ?? "Error al agregar")
      setGuestName("")
      setGuestLastname("")
      onAdded()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-black text-base">Agregar jugador</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {/* Tab toggle */}
        <div className="p-5 pb-0">
          <div className="grid grid-cols-2 bg-muted rounded-xl p-1 gap-1">
            <button
              onClick={() => setTab("registered")}
              className={`py-2 rounded-lg text-[11px] font-black uppercase tracking-wide transition-colors ${
                tab === "registered" ? "bg-card shadow text-foreground" : "text-zinc-400"
              }`}
            >
              Usuario registrado
            </button>
            <button
              onClick={() => setTab("guest")}
              className={`py-2 rounded-lg text-[11px] font-black uppercase tracking-wide transition-colors ${
                tab === "guest" ? "bg-card shadow text-foreground" : "text-zinc-400"
              }`}
            >
              Jugador temporal
            </button>
          </div>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {error}
            </div>
          )}

          {tab === "registered" && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <input
                  className={`${inputCls} pl-9`}
                  placeholder="Buscar por nombre o @username"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                />
              </div>
              {searching && (
                <p className="text-xs text-zinc-400 text-center">Buscando...</p>
              )}
              {results.length > 0 && (
                <div className="border border-border rounded-xl overflow-hidden">
                  {results.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted transition-colors border-b border-border last:border-0"
                    >
                      <div className="size-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600 shrink-0">
                        {(u.full_name ?? u.username ?? "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">
                          {u.full_name ?? u.username}
                        </div>
                        {u.username && (
                          <div className="text-[11px] text-zinc-400">@{u.username}</div>
                        )}
                      </div>
                      <button
                        disabled={loading}
                        onClick={() => addRegistered(u.id)}
                        className="px-3 py-1.5 bg-foreground text-white rounded-lg text-[11px] font-black hover:bg-foreground/90 disabled:opacity-40 transition-colors"
                      >
                        Agregar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "guest" && (
            <div className="flex flex-col gap-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700">
                Solo existe para esta quedada. No necesita cuenta en la plataforma.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wide text-zinc-500 mb-1.5 block">
                    Nombre
                  </label>
                  <input
                    className={inputCls}
                    placeholder="Andrés"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wide text-zinc-500 mb-1.5 block">
                    Apellido
                  </label>
                  <input
                    className={inputCls}
                    placeholder="Torres"
                    value={guestLastname}
                    onChange={(e) => setGuestLastname(e.target.value)}
                  />
                </div>
              </div>
              <button
                disabled={loading || !guestName.trim() || !guestLastname.trim()}
                onClick={addGuest}
                className="w-full py-2.5 bg-foreground text-white rounded-xl text-[11px] font-black uppercase tracking-wide hover:bg-foreground/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="size-3.5" />
                {loading
                  ? "Agregando..."
                  : `Agregar "${guestName} ${guestLastname}" como temporal`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
