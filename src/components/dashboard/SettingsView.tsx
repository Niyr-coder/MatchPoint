"use client"

import { useState, useEffect } from "react"

// ─── Storage helpers ───────────────────────────────────────────────────────────

const STORAGE_KEY = "matchpoint_settings"

interface SettingsState {
  notif_reservas: boolean
  notif_recordatorios: boolean
  notif_torneos: boolean
  notif_mensajes: boolean
  tema: "auto" | "claro" | "oscuro"
  perfil_publico: boolean
  mostrar_estadisticas: boolean
  mostrar_ranking: boolean
  idioma: "es" | "en"
}

const DEFAULT_SETTINGS: SettingsState = {
  notif_reservas: true,
  notif_recordatorios: true,
  notif_torneos: true,
  notif_mensajes: true,
  tema: "auto",
  perfil_publico: true,
  mostrar_estadisticas: true,
  mostrar_ranking: true,
  idioma: "es",
}

function loadSettings(): SettingsState {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<SettingsState>) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(s: SettingsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // localStorage not available — silently ignore
  }
}

// ─── Toggle component ──────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description?: string
}

function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-semibold text-zinc-800">{label}</p>
        {description && (
          <p className="text-xs text-zinc-400 mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          checked ? "bg-[#1d4ed8]" : "bg-zinc-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
        <span className="sr-only">{label}</span>
      </button>
    </div>
  )
}

// ─── Section card wrapper ──────────────────────────────────────────────────────

interface SectionCardProps {
  label: string
  title: string
  children: React.ReactNode
}

function SectionCard({ label, title, children }: SectionCardProps) {
  return (
    <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">
        {label}
      </p>
      <p className="text-lg font-black text-[#0a0a0a] mb-4">{title}</p>
      {children}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function SettingsView() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setSettings(loadSettings())
    setMounted(true)
  }, [])

  function update<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    const next = { ...settings, [key]: value }
    setSettings(next)
    saveSettings(next)
  }

  // Avoid hydration mismatch — render skeleton until client-side state is loaded
  if (!mounted) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl bg-white border border-[#e5e5e5] h-40" />
        ))}
      </div>
    )
  }

  const temaOptions: { value: SettingsState["tema"]; label: string }[] = [
    { value: "auto", label: "Auto" },
    { value: "claro", label: "Claro" },
    { value: "oscuro", label: "Oscuro" },
  ]

  const idiomaOptions: { value: SettingsState["idioma"]; label: string }[] = [
    { value: "es", label: "Español" },
    { value: "en", label: "English" },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Notificaciones */}
      <SectionCard label="Preferencias" title="Notificaciones">
        <div className="divide-y divide-[#f4f4f5]">
          <Toggle
            checked={settings.notif_reservas}
            onChange={(v) => update("notif_reservas", v)}
            label="Reservas confirmadas"
            description="Recibe un aviso cuando tu reserva sea confirmada"
          />
          <Toggle
            checked={settings.notif_recordatorios}
            onChange={(v) => update("notif_recordatorios", v)}
            label="Recordatorios de clase"
            description="Recuerda tus próximas clases con anticipación"
          />
          <Toggle
            checked={settings.notif_torneos}
            onChange={(v) => update("notif_torneos", v)}
            label="Nuevos torneos"
            description="Entérate cuando se abra la inscripción a un torneo"
          />
          <Toggle
            checked={settings.notif_mensajes}
            onChange={(v) => update("notif_mensajes", v)}
            label="Mensajes del club"
            description="Comunicados y novedades de tu club"
          />
        </div>
      </SectionCard>

      {/* Apariencia */}
      <SectionCard label="Personalización" title="Apariencia">
        <div className="flex items-center gap-2">
          {temaOptions.map((opt) => {
            const active = settings.tema === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update("tema", opt.value)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.1em] border transition-colors ${
                  active
                    ? "bg-[#0a0a0a] text-white border-[#0a0a0a]"
                    : "bg-white text-zinc-600 border-[#e5e5e5] hover:border-zinc-300"
                }`}
              >
                {active && (
                  <span className="size-1.5 rounded-full bg-white" />
                )}
                {opt.label}
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-zinc-400 mt-3">
          El cambio de tema visual estará disponible próximamente.
        </p>
      </SectionCard>

      {/* Privacidad */}
      <SectionCard label="Seguridad" title="Privacidad">
        <div className="divide-y divide-[#f4f4f5]">
          <Toggle
            checked={settings.perfil_publico}
            onChange={(v) => update("perfil_publico", v)}
            label="Perfil público"
            description="Tu perfil es visible para otros usuarios"
          />
          <Toggle
            checked={settings.mostrar_estadisticas}
            onChange={(v) => update("mostrar_estadisticas", v)}
            label="Mostrar estadísticas"
            description="Otros jugadores pueden ver tus estadísticas"
          />
          <Toggle
            checked={settings.mostrar_ranking}
            onChange={(v) => update("mostrar_ranking", v)}
            label="Mostrar ranking"
            description="Tu posición en el ranking es pública"
          />
        </div>
      </SectionCard>

      {/* Idioma */}
      <SectionCard label="Regional" title="Idioma">
        <div className="flex items-center gap-2">
          {idiomaOptions.map((opt) => {
            const active = settings.idioma === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update("idioma", opt.value)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.1em] border transition-colors ${
                  active
                    ? "bg-[#0a0a0a] text-white border-[#0a0a0a]"
                    : "bg-white text-zinc-600 border-[#e5e5e5] hover:border-zinc-300"
                }`}
              >
                {active && (
                  <span className="size-1.5 rounded-full bg-white" />
                )}
                {opt.label}
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-zinc-400 mt-3">
          El soporte multi-idioma estará disponible próximamente.
        </p>
      </SectionCard>
    </div>
  )
}
