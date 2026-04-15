"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import type { GameDynamic } from "@/features/organizer/types"

const DYNAMICS: { value: GameDynamic; label: string; emoji: string; description: string }[] = [
  { value: "standard",      label: "Estándar",          emoji: "🎯", description: "Partidos normales, sin rotación" },
  { value: "king_of_court", label: "King of the Court", emoji: "👑", description: "Ganador se queda, perdedor rota" },
  { value: "popcorn",       label: "Popcorn",           emoji: "🍿", description: "Rotación aleatoria por puntos" },
  { value: "round_robin",   label: "Round Robin",       emoji: "🔄", description: "Todos contra todos" },
]

const MODALITIES = ["Singles", "Dobles", "Mixtos"] as const
const MAX_PLAYERS = [4, 8, 16, 32] as const

const COURT_OPTIONS = [1, 2, 3, 4, 5, 6] as const

function playersPerCourt(modality: string): number {
  return modality === "Dobles" || modality === "Mixtos" ? 4 : 2
}

const inputCls =
  "w-full px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground placeholder:text-zinc-300 focus:outline-none focus:border-foreground transition-colors bg-card"
const labelCls = "text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500"

interface WizardForm {
  name: string
  game_dynamic: GameDynamic | ""
  modality: string
  court_count: number
  max_participants: number
  start_date: string
  start_time: string
  club_id: string
  is_public: boolean
}

function ProgressBar({ current }: { current: number }) {
  const steps = ["Detalles", "Fecha & Acceso", "Jugadores"]
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2">
            <div
              className={`size-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                i + 1 < current
                  ? "bg-foreground border-foreground text-white"
                  : i + 1 === current
                  ? "border-foreground text-foreground bg-card"
                  : "border-zinc-200 text-zinc-300 bg-card"
              }`}
            >
              {i + 1 < current ? "✓" : i + 1}
            </div>
            <span
              className={`text-[10px] font-black uppercase tracking-wide hidden sm:block ${
                i + 1 <= current ? "text-foreground" : "text-zinc-300"
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-3 transition-colors ${
                i + 1 < current ? "bg-foreground" : "bg-zinc-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export function QuedadaWizard({ clubs }: { clubs: { id: string; name: string }[] }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<WizardForm>({
    name: "",
    game_dynamic: "",
    modality: "",
    court_count: 1,
    max_participants: 4,
    start_date: "",
    start_time: "",
    club_id: clubs[0]?.id ?? "",
    is_public: false,
  })

  function update<K extends keyof WizardForm>(key: K, value: WizardForm[K]) {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === "court_count" || key === "modality") {
        const ppc = playersPerCourt(next.modality)
        const minMax = (next.court_count as number) * ppc
        if (next.max_participants < minMax) {
          next.max_participants = minMax
        }
      }
      return next
    })
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/quedadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          game_dynamic: form.game_dynamic,
          modality: form.modality,
          court_count: form.court_count,
          max_participants: form.max_participants,
          start_date: form.start_date,
          start_time: form.start_time,
          club_id: form.is_public ? undefined : form.club_id || undefined,
          is_public: form.is_public,
        }),
      })
      const json = (await res.json()) as {
        success: boolean
        data?: { id: string }
        error?: string
      }
      if (!json.success) throw new Error(json.error ?? "Error al crear quedada")
      router.push(`/dashboard/organizer/${json.data!.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() =>
            step > 1 ? setStep(s => s - 1) : router.push("/dashboard/organizer")
          }
          className="p-2 rounded-xl border border-border hover:border-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            Organización
          </p>
          <h1 className="text-xl font-black">Nueva Quedada</h1>
        </div>
      </div>

      <ProgressBar current={step} />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="flex flex-col gap-5">
          <div>
            <label className={labelCls}>Nombre</label>
            <input
              className={`${inputCls} mt-2`}
              placeholder="Ej: Quedada Pickleball Lunes"
              value={form.name}
              onChange={e => update("name", e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls}>Deporte</label>
            <div className="mt-2 px-4 py-2.5 rounded-xl border border-border bg-muted text-sm font-medium text-zinc-400 flex items-center justify-between">
              <span>🏓 Pickleball</span>
            </div>
          </div>

          <div>
            <label className={labelCls}>Dinámica de juego</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {DYNAMICS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => update("game_dynamic", d.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-colors ${
                    form.game_dynamic === d.value
                      ? "border-foreground bg-foreground text-white"
                      : "border-border hover:border-foreground/50"
                  }`}
                >
                  <div className="text-sm font-bold">
                    {d.emoji} {d.label}
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 ${
                      form.game_dynamic === d.value ? "opacity-75" : "text-zinc-500"
                    }`}
                  >
                    {d.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Modalidad</label>
            <div className="mt-2 flex gap-2">
              {MODALITIES.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => update("modality", m)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-[12px] font-black uppercase tracking-wide transition-colors ${
                    form.modality === m
                      ? "border-foreground bg-foreground text-white"
                      : "border-border hover:border-foreground/50"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Court picker */}
          <div>
            <label className={labelCls}>Canchas disponibles</label>
            <div className="mt-2 flex gap-2">
              {COURT_OPTIONS.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => update("court_count", n)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-black transition-colors ${
                    form.court_count === n
                      ? "border-foreground bg-foreground text-white"
                      : "border-border hover:border-foreground/50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            {form.modality && (
              <div className="mt-2 px-3 py-2 bg-muted rounded-xl text-xs text-zinc-500 font-medium">
                {(() => {
                  const ppc = playersPerCourt(form.modality)
                  const active = form.court_count * ppc
                  const waiting = Math.max(0, form.max_participants - active)
                  return `${form.court_count} cancha${form.court_count > 1 ? "s" : ""} × ${ppc} jugadores = ${active} activos${waiting > 0 ? ` · ${waiting} en espera` : ""}`
                })()}
              </div>
            )}
          </div>

          {/* Max participants — numeric input */}
          <div>
            <label className={labelCls}>Máx. jugadores (total)</label>
            <input
              type="number"
              className={`${inputCls} mt-2`}
              min={form.modality ? form.court_count * playersPerCourt(form.modality) : 4}
              max={64}
              value={form.max_participants}
              onChange={e => {
                const val = Math.max(
                  form.modality ? form.court_count * playersPerCourt(form.modality) : 4,
                  Number(e.target.value)
                )
                update("max_participants", val)
              }}
            />
            {form.modality && (
              <p className="mt-1 text-[11px] text-zinc-400">
                Mínimo: {form.court_count * playersPerCourt(form.modality)} jugadores
              </p>
            )}
          </div>

          <button
            disabled={!form.name || !form.game_dynamic || !form.modality}
            onClick={() => setStep(2)}
            className="w-full py-3 bg-foreground text-white rounded-xl text-[12px] font-black uppercase tracking-wide hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Continuar →
          </button>
        </div>
      )}

      {/* Step 2: Date & Access */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fecha</label>
              <input
                type="date"
                className={`${inputCls} mt-2`}
                value={form.start_date}
                onChange={e => update("start_date", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Hora</label>
              <input
                type="time"
                className={`${inputCls} mt-2`}
                value={form.start_time}
                onChange={e => update("start_time", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Visibilidad</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => update("is_public", false)}
                className={`p-3 rounded-xl border-2 text-left transition-colors ${
                  !form.is_public
                    ? "border-foreground bg-foreground text-white"
                    : "border-border"
                }`}
              >
                <div className="text-sm font-bold">🔒 Solo miembros del club</div>
                <div
                  className={`text-[11px] mt-0.5 ${
                    !form.is_public ? "opacity-75" : "text-zinc-500"
                  }`}
                >
                  Privado
                </div>
              </button>
              <button
                type="button"
                onClick={() => update("is_public", true)}
                className={`p-3 rounded-xl border-2 text-left transition-colors ${
                  form.is_public
                    ? "border-foreground bg-foreground text-white"
                    : "border-border"
                }`}
              >
                <div className="text-sm font-bold">🌐 Pública</div>
                <div
                  className={`text-[11px] mt-0.5 ${
                    form.is_public ? "opacity-75" : "text-zinc-500"
                  }`}
                >
                  Cualquier usuario
                </div>
              </button>
            </div>
          </div>

          {!form.is_public && clubs.length > 0 && (
            <div>
              <label className={labelCls}>Club</label>
              <select
                className={`${inputCls} mt-2`}
                value={form.club_id}
                onChange={e => update("club_id", e.target.value)}
              >
                {clubs.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            disabled={!form.start_date || !form.start_time}
            onClick={() => setStep(3)}
            className="w-full py-3 bg-foreground text-white rounded-xl text-[12px] font-black uppercase tracking-wide hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Continuar →
          </button>
        </div>
      )}

      {/* Step 3: Summary + create */}
      {step === 3 && (
        <div className="flex flex-col gap-5">
          <div className="bg-muted rounded-2xl p-4 flex flex-col gap-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-2">
              Resumen
            </p>
            <div className="text-sm font-bold">{form.name}</div>
            <div className="text-xs text-zinc-500">
              🏓 Pickleball · {form.modality} · {form.game_dynamic}
            </div>
            <div className="text-xs text-zinc-500">
              📅 {form.start_date} {form.start_time} · 👥 máx {form.max_participants} ·{" "}
              {form.court_count} cancha{form.court_count > 1 ? "s" : ""} ·{" "}
              {form.court_count * playersPerCourt(form.modality || "Singles")} activos
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            Después de crear la quedada podrás agregar jugadores manualmente o compartir el link de
            invitación.
          </div>

          <button
            disabled={loading}
            onClick={handleSubmit}
            className="w-full py-3 bg-foreground text-white rounded-xl text-[12px] font-black uppercase tracking-wide hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creando..." : "Crear Quedada ✓"}
          </button>
        </div>
      )}
    </div>
  )
}
