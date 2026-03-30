"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Trophy, ArrowLeft } from "lucide-react"
import Link from "next/link"

const SPORTS = [
  { value: "pickleball", label: "Pickleball", emoji: "🏓" },
  { value: "padel", label: "Pádel", emoji: "🎾" },
  { value: "tenis", label: "Tenis", emoji: "🎾" },
  { value: "futbol", label: "Fútbol", emoji: "⚽" },
] as const

type SportValue = (typeof SPORTS)[number]["value"]

const MODALITIES: Record<SportValue, string[]> = {
  pickleball: ["Singles", "Dobles", "Mixtos", "Round Robin", "Eliminación Directa", "King of the Court"],
  padel: ["Singles", "Dobles", "Americano", "Cuadrangular"],
  tenis: ["Singles", "Dobles", "Mixtos"],
  futbol: ["5 vs 5", "7 vs 7", "11 vs 11"],
}

interface ExtrasState {
  sorteos: { enabled: boolean; detail: string }
  premios: { enabled: boolean; detail: string }
  streaming: { enabled: boolean }
  fotografia: { enabled: boolean }
  arbitro: { enabled: boolean }
  patrocinador: { enabled: boolean; name: string }
}

const inputCls =
  "w-full px-4 py-2.5 rounded-xl border border-[#e5e5e5] text-sm font-medium text-[#0a0a0a] placeholder:text-zinc-300 focus:outline-none focus:border-[#1a56db] transition-colors bg-white"
const labelCls =
  "text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500"

function ProgressBar({ current }: { current: number }) {
  const steps = ["Básico", "Fecha & Hora", "Extras"]
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2">
            <div
              className={`size-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                i + 1 < current
                  ? "bg-[#1a56db] border-[#1a56db] text-white"
                  : i + 1 === current
                  ? "border-[#1a56db] text-[#1a56db] bg-white"
                  : "border-zinc-200 text-zinc-300 bg-white"
              }`}
            >
              {i + 1 < current ? "✓" : i + 1}
            </div>
            <span
              className={`text-[10px] font-black uppercase tracking-wide hidden sm:block ${
                i + 1 <= current ? "text-[#1a56db]" : "text-zinc-300"
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-3 transition-colors ${
                i + 1 < current ? "bg-[#1a56db]" : "bg-zinc-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function ExtraToggle({
  label,
  description,
  icon,
  enabled,
  onToggle,
  children,
}: {
  label: string
  description: string
  icon: string
  enabled: boolean
  onToggle: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="border border-[#e5e5e5] rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xl leading-none">{icon}</span>
          <div>
            <p className="text-sm font-bold text-zinc-800">{label}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
            enabled ? "bg-[#1a56db]" : "bg-zinc-200"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
      {enabled && children && (
        <div className="pt-3 border-t border-[#f0f0f0]">{children}</div>
      )}
    </div>
  )
}

export default function CreateTournamentPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clubs, setClubs] = useState<Array<{ id: string; name: string }>>([])

  const [form, setForm] = useState({
    name: "",
    sport: "pickleball" as SportValue,
    modality: "",
    club_id: "",
    start_date: "",
    start_time: "",
    end_date: "",
    entry_fee: 0,
    description: "",
    is_official: false,
    extras: {
      sorteos: { enabled: false, detail: "" },
      premios: { enabled: false, detail: "" },
      streaming: { enabled: false },
      fotografia: { enabled: false },
      arbitro: { enabled: false },
      patrocinador: { enabled: false, name: "" },
    } as ExtrasState,
  })

  useEffect(() => {
    fetch("/api/clubs")
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: Array<{ id: string; name: string }>; clubs?: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }>) => {
        if (Array.isArray(d)) {
          setClubs(d)
        } else if (d.data) {
          setClubs(d.data)
        } else if (d.clubs) {
          setClubs(d.clubs)
        }
      })
      .catch(() => {})
  }, [])

  const canProceedStep1 = form.name.trim().length >= 3
  const canProceedStep2 = form.start_date !== "" && form.start_time !== ""

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const payload = {
        name: form.name,
        sport: form.sport,
        modality: form.modality || undefined,
        club_id: form.club_id || undefined,
        start_date: form.start_date,
        start_time: form.start_time || undefined,
        end_date: form.end_date || undefined,
        entry_fee: form.entry_fee,
        description: form.description || undefined,
        is_official: form.extras.arbitro.enabled,
        extras: form.extras,
      }
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as { success: boolean; error?: string; data?: { id: string } }
      if (!data.success) {
        setError(data.error ?? "Error al crear torneo")
        return
      }
      router.push(`/dashboard/tournaments/${data.data?.id}`)
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/tournaments"
          className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 hover:text-zinc-600 mb-4"
        >
          <ArrowLeft className="size-3" /> Volver a torneos
        </Link>
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#1a56db] flex items-center justify-center">
            <Trophy className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#0a0a0a]">
              Crear Torneo
            </h1>
            <p className="text-xs text-zinc-400">Organiza tu propia competencia</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6">
        <ProgressBar current={step} />

        {/* STEP 1 */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Nombre del torneo *</label>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Copa Pickleball Quito 2025"
                minLength={3}
                maxLength={100}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelCls}>Deporte *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SPORTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, sport: s.value, modality: "" }))
                    }
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all font-bold text-sm ${
                      form.sport === s.value
                        ? "border-[#1a56db] bg-[#1a56db] text-white"
                        : "border-[#e5e5e5] text-zinc-600 hover:border-zinc-300"
                    }`}
                  >
                    <span className="text-xl">{s.emoji}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {form.sport && MODALITIES[form.sport]?.length > 0 && (
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Modalidad</label>
                <div className="flex flex-wrap gap-2">
                  {MODALITIES[form.sport].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          modality: f.modality === m ? "" : m,
                        }))
                      }
                      className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                        form.modality === m
                          ? "border-[#1a56db] bg-[#1a56db] text-white"
                          : "border-[#e5e5e5] text-zinc-600 hover:border-zinc-300"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Club sede</label>
              <select
                className={inputCls}
                value={form.club_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, club_id: e.target.value }))
                }
              >
                <option value="">Sin club (independiente)</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={!canProceedStep1}
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-[#1a56db] text-white text-sm font-black uppercase tracking-[0.1em] hover:bg-[#1648c0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente →
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Fecha del torneo *</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.start_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, start_date: e.target.value }))
                  }
                  min={new Date().toISOString().split("T")[0]}
                />
                <p className="text-[10px] text-zinc-400">
                  Se añadirá al calendario oficial de MATCHPOINT
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Hora de inicio *</label>
                <input
                  type="time"
                  className={inputCls}
                  value={form.start_time}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, start_time: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Fecha de cierre (opcional)</label>
              <input
                type="date"
                className={inputCls}
                value={form.end_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, end_date: e.target.value }))
                }
              />
              <p className="text-[10px] text-zinc-400">
                Para torneos de varios días
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Costo de inscripción</label>
              <div className="flex items-center border border-[#e5e5e5] rounded-xl overflow-hidden focus-within:border-[#1a56db] transition-colors">
                <span className="px-3 py-2.5 bg-zinc-50 border-r border-[#e5e5e5] text-sm text-zinc-500 font-medium">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.entry_fee}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      entry_fee: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="flex-1 px-3 py-2.5 text-sm font-medium text-[#0a0a0a] focus:outline-none bg-white"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Descripción (opcional)</label>
              <textarea
                rows={3}
                className={inputCls + " resize-none"}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Formato del torneo, nivel requerido, información adicional..."
                maxLength={1000}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl border border-[#e5e5e5] text-zinc-600 text-sm font-black uppercase tracking-[0.1em] hover:bg-zinc-50 transition-colors"
              >
                ← Atrás
              </button>
              <button
                type="button"
                disabled={!canProceedStep2}
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl bg-[#1a56db] text-white text-sm font-black uppercase tracking-[0.1em] hover:bg-[#1648c0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-bold text-zinc-800">
                Personaliza tu torneo
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Activa las opciones adicionales para enriquecer la experiencia
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <ExtraToggle
                label="Árbitro oficial"
                description="Resultados verificados, cuenta para el rating oficial"
                icon="🏅"
                enabled={form.extras.arbitro.enabled}
                onToggle={() =>
                  setForm((f) => ({
                    ...f,
                    extras: {
                      ...f.extras,
                      arbitro: { enabled: !f.extras.arbitro.enabled },
                    },
                  }))
                }
              >
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <span>⚡</span>
                  <p className="text-xs text-amber-800 font-medium">
                    Este torneo contará para el{" "}
                    <strong>rating oficial</strong> de todos los participantes.
                  </p>
                </div>
              </ExtraToggle>

              <ExtraToggle
                label="Sorteos"
                description="Realiza sorteos durante el evento"
                icon="🎲"
                enabled={form.extras.sorteos.enabled}
                onToggle={() =>
                  setForm((f) => ({
                    ...f,
                    extras: {
                      ...f.extras,
                      sorteos: {
                        ...f.extras.sorteos,
                        enabled: !f.extras.sorteos.enabled,
                      },
                    },
                  }))
                }
              >
                <input
                  className={inputCls}
                  placeholder="Describe los sorteos..."
                  value={form.extras.sorteos.detail}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      extras: {
                        ...f.extras,
                        sorteos: {
                          ...f.extras.sorteos,
                          detail: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </ExtraToggle>

              <ExtraToggle
                label="Premios"
                description="Medallas, trofeos o premios en metálico"
                icon="🏆"
                enabled={form.extras.premios.enabled}
                onToggle={() =>
                  setForm((f) => ({
                    ...f,
                    extras: {
                      ...f.extras,
                      premios: {
                        ...f.extras.premios,
                        enabled: !f.extras.premios.enabled,
                      },
                    },
                  }))
                }
              >
                <input
                  className={inputCls}
                  placeholder="Ej: Trofeos para top 3 + $200 al ganador"
                  value={form.extras.premios.detail}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      extras: {
                        ...f.extras,
                        premios: {
                          ...f.extras.premios,
                          detail: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </ExtraToggle>

              <ExtraToggle
                label="Streaming"
                description="Transmisión en vivo del evento"
                icon="📹"
                enabled={form.extras.streaming.enabled}
                onToggle={() =>
                  setForm((f) => ({
                    ...f,
                    extras: {
                      ...f.extras,
                      streaming: { enabled: !f.extras.streaming.enabled },
                    },
                  }))
                }
              />

              <ExtraToggle
                label="Fotografía oficial"
                description="Fotógrafo oficial en el evento"
                icon="📸"
                enabled={form.extras.fotografia.enabled}
                onToggle={() =>
                  setForm((f) => ({
                    ...f,
                    extras: {
                      ...f.extras,
                      fotografia: { enabled: !f.extras.fotografia.enabled },
                    },
                  }))
                }
              />

              <ExtraToggle
                label="Patrocinador"
                description="El torneo cuenta con patrocinio"
                icon="🤝"
                enabled={form.extras.patrocinador.enabled}
                onToggle={() =>
                  setForm((f) => ({
                    ...f,
                    extras: {
                      ...f.extras,
                      patrocinador: {
                        ...f.extras.patrocinador,
                        enabled: !f.extras.patrocinador.enabled,
                      },
                    },
                  }))
                }
              >
                <input
                  className={inputCls}
                  placeholder="Nombre del patrocinador"
                  value={form.extras.patrocinador.name}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      extras: {
                        ...f.extras,
                        patrocinador: {
                          ...f.extras.patrocinador,
                          name: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </ExtraToggle>
            </div>

            {/* Summary card */}
            <div className="bg-zinc-50 border border-[#e5e5e5] rounded-2xl p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-3">
                Resumen
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-zinc-400">Nombre</span>
                  <p className="font-bold text-zinc-800 truncate">
                    {form.name || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-400">Deporte</span>
                  <p className="font-bold text-zinc-800">
                    {SPORTS.find((s) => s.value === form.sport)?.label}
                    {form.modality ? ` · ${form.modality}` : ""}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-400">Fecha</span>
                  <p className="font-bold text-zinc-800">
                    {form.start_date || "—"}
                    {form.start_time ? ` a las ${form.start_time}` : ""}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-400">Inscripción</span>
                  <p className="font-bold text-zinc-800">
                    ${form.entry_fee.toFixed(2)}
                  </p>
                </div>
                {form.extras.arbitro.enabled && (
                  <div className="col-span-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1">
                      🏅 TORNEO OFICIAL · Cuenta para el rating
                    </span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-xl border border-[#e5e5e5] text-zinc-600 text-sm font-black uppercase tracking-[0.1em] hover:bg-zinc-50 transition-colors"
              >
                ← Atrás
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-[#1a56db] text-white text-sm font-black uppercase tracking-[0.1em] hover:bg-[#1648c0] transition-colors disabled:opacity-50"
              >
                {loading ? "Creando..." : "Crear Torneo 🏆"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
