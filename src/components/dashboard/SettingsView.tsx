"use client"

import { useState, useEffect, useCallback } from "react"
import type { UserSettings } from "@/app/api/profile/settings/route"

// ─── Types ─────────────────────────────────────────────────────────────────────

type SettingsState = Required<UserSettings>

// ─── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "matchpoint_settings"

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

// ─── localStorage helpers ──────────────────────────────────────────────────────

function readCache(): SettingsState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<SettingsState>) }
  } catch {
    return null
  }
}

function writeCache(s: SettingsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // localStorage unavailable — ignore
  }
}

// ─── Toggle component ──────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}

function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
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
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? "bg-primary" : "bg-zinc-200"
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
    <div className="rounded-2xl bg-card border border-border p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">
        {label}
      </p>
      <p className="text-lg font-black text-foreground mb-4">{title}</p>
      {children}
    </div>
  )
}

// ─── Error banner ──────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

type LoadState = "idle" | "loading" | "ready" | "error"
type SaveState = "idle" | "saving" | "error"

export function SettingsView() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS)
  const [loadState, setLoadState] = useState<LoadState>("idle")
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Load settings on mount ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function fetchSettings() {
      // Show cached data immediately to avoid empty skeleton flash
      const cached = readCache()
      if (cached) {
        setSettings(cached)
        setLoadState("ready")
      } else {
        setLoadState("loading")
      }

      try {
        const res = await fetch("/api/profile/settings")
        if (cancelled) return

        if (!res.ok) {
          // Fallback to cache (already applied above) or defaults
          if (!cached) setLoadState("error")
          return
        }

        const json = (await res.json()) as { success: boolean; data: Partial<SettingsState> | null; error: string | null }
        if (cancelled) return

        if (json.success && json.data) {
          const merged: SettingsState = { ...DEFAULT_SETTINGS, ...json.data }
          setSettings(merged)
          writeCache(merged)
        }

        setLoadState("ready")
      } catch {
        if (cancelled) return
        // Network error — keep cached/default values, surface error only if nothing was cached
        if (!cached) setLoadState("error")
      }
    }

    void fetchSettings()
    return () => { cancelled = true }
  }, [])

  // ── Persist a single setting change ───────────────────────────────────────
  const update = useCallback(
    async <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
      // Optimistic local update
      const next: SettingsState = { ...settings, [key]: value }
      setSettings(next)
      writeCache(next)
      setSaveState("saving")
      setSaveError(null)

      try {
        const res = await fetch("/api/profile/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: value }),
        })

        const json = (await res.json()) as { success: boolean; data: Partial<SettingsState> | null; error: string | null }

        if (!res.ok || !json.success) {
          // Rollback optimistic update
          setSettings(settings)
          writeCache(settings)
          setSaveError(json.error ?? "Error al guardar los ajustes")
          setSaveState("error")
          return
        }

        if (json.data) {
          const synced: SettingsState = { ...DEFAULT_SETTINGS, ...json.data }
          setSettings(synced)
          writeCache(synced)
        }

        setSaveState("idle")
      } catch {
        // Rollback on network error
        setSettings(settings)
        writeCache(settings)
        setSaveError("Sin conexión. Intenta de nuevo.")
        setSaveState("error")
      }
    },
    [settings]
  )

  // ── Skeleton while first load with no cache ───────────────────────────────
  if (loadState === "loading") {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl bg-card border border-border h-40" />
        ))}
      </div>
    )
  }

  if (loadState === "error") {
    return (
      <ErrorBanner message="No se pudieron cargar tus ajustes. Recarga la página." />
    )
  }

  const isBusy = saveState === "saving"

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
      {saveState === "error" && saveError && (
        <ErrorBanner message={saveError} />
      )}

      {/* Notificaciones */}
      <SectionCard label="Preferencias" title="Notificaciones">
        <div className="divide-y divide-[#f4f4f5]">
          <Toggle
            checked={settings.notif_reservas}
            onChange={(v) => void update("notif_reservas", v)}
            label="Reservas confirmadas"
            description="Recibe un aviso cuando tu reserva sea confirmada"
            disabled={isBusy}
          />
          <Toggle
            checked={settings.notif_recordatorios}
            onChange={(v) => void update("notif_recordatorios", v)}
            label="Recordatorios de clase"
            description="Recuerda tus próximas clases con anticipación"
            disabled={isBusy}
          />
          <Toggle
            checked={settings.notif_torneos}
            onChange={(v) => void update("notif_torneos", v)}
            label="Nuevos torneos"
            description="Entérate cuando se abra la inscripción a un torneo"
            disabled={isBusy}
          />
          <Toggle
            checked={settings.notif_mensajes}
            onChange={(v) => void update("notif_mensajes", v)}
            label="Mensajes del club"
            description="Comunicados y novedades de tu club"
            disabled={isBusy}
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
                disabled={isBusy}
                onClick={() => void update("tema", opt.value)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.1em] border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  active
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-muted-foreground border-border hover:border-border/60"
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
            onChange={(v) => void update("perfil_publico", v)}
            label="Perfil público"
            description="Tu perfil es visible para otros usuarios"
            disabled={isBusy}
          />
          <Toggle
            checked={settings.mostrar_estadisticas}
            onChange={(v) => void update("mostrar_estadisticas", v)}
            label="Mostrar estadísticas"
            description="Otros jugadores pueden ver tus estadísticas"
            disabled={isBusy}
          />
          <Toggle
            checked={settings.mostrar_ranking}
            onChange={(v) => void update("mostrar_ranking", v)}
            label="Mostrar ranking"
            description="Tu posición en el ranking es pública"
            disabled={isBusy}
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
                disabled={isBusy}
                onClick={() => void update("idioma", opt.value)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.1em] border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  active
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-muted-foreground border-border hover:border-border/60"
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
