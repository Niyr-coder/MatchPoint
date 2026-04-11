"use client"

import { useState } from "react"
import { Users, PlusCircle, LogIn } from "lucide-react"
import { VISIBLE_SPORT_OPTIONS, PRIMARY_SPORT, SINGLE_SPORT_MODE } from "@/lib/sports/config"

interface TeamMember {
  id: string
  user_id: string
  role: "captain" | "member"
  profile: {
    id: string
    full_name: string | null
    username: string | null
    avatar_url: string | null
  }
}

interface Team {
  id: string
  name: string
  sport: string
  description: string | null
  invite_code: string
  members: TeamMember[]
}

interface TeamOnboardingProps {
  onJoined: (team: Team) => void
}

type ActivePanel = "create" | "join" | null

interface CreateFormState {
  name: string
  sport: string
  description: string
}

interface CreateFormErrors {
  name?: string
  sport?: string
}

export function TeamOnboarding({ onJoined }: TeamOnboardingProps) {
  const [active, setActive] = useState<ActivePanel>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Create form state — pre-select the primary sport in single-sport mode
  const [createForm, setCreateForm] = useState<CreateFormState>({
    name: "",
    sport: SINGLE_SPORT_MODE ? PRIMARY_SPORT : "",
    description: "",
  })
  const [createErrors, setCreateErrors] = useState<CreateFormErrors>({})

  // Join form state
  const [inviteCode, setInviteCode] = useState("")
  const [joinError, setJoinError] = useState<string | null>(null)

  function validateCreate(): boolean {
    const errors: CreateFormErrors = {}
    if (!createForm.name.trim()) errors.name = "El nombre es obligatorio."
    if (!createForm.sport) errors.sport = "Selecciona un deporte."
    // In single-sport mode the field is pre-filled — no way to leave it blank
    setCreateErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!validateCreate()) return
    setIsSubmitting(true)
    setServerError(null)
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          sport: createForm.sport,
          description: createForm.description.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setServerError(json.error ?? "Error al crear el team.")
        return
      }
      onJoined(json.data as Team)
    } catch {
      setServerError("Error de red. Intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const code = inviteCode.trim().toUpperCase()
    if (code.length !== 8) {
      setJoinError("El código debe tener exactamente 8 caracteres.")
      return
    }
    setIsSubmitting(true)
    setJoinError(null)
    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: code }),
      })
      const json = await res.json()
      if (!res.ok) {
        setJoinError(json.error ?? "Código inválido o team no encontrado.")
        return
      }
      onJoined(json.data as Team)
    } catch {
      setJoinError("Error de red. Intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (active === null) {
    return (
      <div className="flex flex-col items-center py-16 px-4">
        <div className="size-14 rounded-xl bg-muted border border-border flex items-center justify-center mb-6">
          <Users className="size-7 text-zinc-400" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground text-center">
          Mi Team
        </h1>
        <p className="mt-2 text-sm text-zinc-400 text-center max-w-sm leading-relaxed">
          Crea tu propio team o únete a uno con un código de invitación.
        </p>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          {/* Create card */}
          <button
            onClick={() => setActive("create")}
            className="flex flex-col items-start rounded-2xl bg-card border border-border p-6 text-left hover:bg-secondary hover:border-border/60 transition-colors"
          >
            <div className="size-10 rounded-xl bg-foreground flex items-center justify-center mb-4">
              <PlusCircle className="size-5 text-white" />
            </div>
            <p className="text-sm font-black text-foreground uppercase tracking-wide">Crear team</p>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
              Sé el capitán, define el deporte y comparte el código de invitación.
            </p>
          </button>

          {/* Join card */}
          <button
            onClick={() => setActive("join")}
            className="flex flex-col items-start rounded-2xl bg-card border border-border p-6 text-left hover:bg-secondary hover:border-border/60 transition-colors"
          >
            <div className="size-10 rounded-xl bg-muted border border-border flex items-center justify-center mb-4">
              <LogIn className="size-5 text-zinc-500" />
            </div>
            <p className="text-sm font-black text-foreground uppercase tracking-wide">Unirse a team</p>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
              Ingresa el código de 8 caracteres que te compartió tu capitán.
            </p>
          </button>
        </div>
      </div>
    )
  }

  if (active === "create") {
    return (
      <div className="max-w-md mx-auto py-10">
        <button
          onClick={() => {
            setActive(null)
            setCreateErrors({})
            setServerError(null)
          }}
          className="text-[11px] font-black uppercase tracking-wide text-zinc-400 hover:text-foreground transition-colors mb-6"
        >
          ← Volver
        </button>

        <div className="rounded-2xl bg-card border border-border p-6">
          <h2 className="text-lg font-black tracking-tight text-foreground mb-6">
            Crear un team
          </h2>

          <form onSubmit={handleCreate} noValidate className="space-y-5">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 block mb-1.5">
                Nombre del team <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Los Cóndores"
                maxLength={60}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-foreground/10"
              />
              {createErrors.name && (
                <p className="mt-1 text-xs font-semibold text-red-500">{createErrors.name}</p>
              )}
            </div>

            {/* Sport selector — hidden when only one sport is available */}
            {!SINGLE_SPORT_MODE && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 block mb-1.5">
                  Deporte <span className="text-red-400">*</span>
                </label>
                <select
                  value={createForm.sport}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, sport: e.target.value }))
                  }
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 bg-card"
                >
                  <option value="" disabled>
                    Selecciona un deporte
                  </option>
                  {VISIBLE_SPORT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {createErrors.sport && (
                  <p className="mt-1 text-xs font-semibold text-red-500">{createErrors.sport}</p>
                )}
              </div>
            )}

            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 block mb-1.5">
                Descripción <span className="text-zinc-300 font-medium normal-case">(opcional)</span>
              </label>
              <textarea
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Una breve descripción del equipo..."
                rows={3}
                maxLength={200}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-foreground/10 resize-none"
              />
            </div>

            {serverError && (
              <p className="text-xs font-semibold text-red-500">{serverError}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-foreground text-white rounded-full px-4 py-3 text-[11px] font-black uppercase tracking-wide disabled:opacity-50 hover:bg-foreground/90 transition-colors"
            >
              {isSubmitting ? "Creando..." : "Crear team"}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // active === "join"
  return (
    <div className="max-w-md mx-auto py-10">
      <button
        onClick={() => {
          setActive(null)
          setJoinError(null)
          setInviteCode("")
        }}
        className="text-[11px] font-black uppercase tracking-wide text-zinc-400 hover:text-foreground transition-colors mb-6"
      >
        ← Volver
      </button>

      <div className="rounded-2xl bg-card border border-border p-6">
        <h2 className="text-lg font-black tracking-tight text-foreground mb-2">
          Unirse a un team
        </h2>
        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          Ingresa el código de 8 caracteres que te compartió tu capitán.
        </p>

        <form onSubmit={handleJoin} noValidate className="space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 block mb-1.5">
              Código de invitación
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value.toUpperCase().slice(0, 8))
                setJoinError(null)
              }}
              placeholder="ABCD1234"
              maxLength={8}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm font-black text-foreground placeholder:text-zinc-300 tracking-widest focus:outline-none focus:ring-2 focus:ring-foreground/10 uppercase"
            />
            {joinError && (
              <p className="mt-1 text-xs font-semibold text-red-500">{joinError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || inviteCode.length !== 8}
            className="w-full bg-foreground text-white rounded-full px-4 py-3 text-[11px] font-black uppercase tracking-wide disabled:opacity-50 hover:bg-foreground/90 transition-colors"
          >
            {isSubmitting ? "Buscando..." : "Unirme al team"}
          </button>
        </form>
      </div>
    </div>
  )
}
