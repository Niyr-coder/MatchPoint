"use client"

import { useEffect, useState, useTransition } from "react"
import { Settings, AlertTriangle, Save, ToggleLeft, ToggleRight } from "lucide-react"
import type { PlatformSettings } from "@/app/api/admin/settings/route"

// ── helpers ────────────────────────────────────────────────────────────────────

function useAutoReset<T>(
  value: T,
  reset: () => void,
  delay = 4000
): void {
  useEffect(() => {
    if (!value) return
    const id = setTimeout(reset, delay)
    return () => clearTimeout(id)
  }, [value, reset, delay])
}

// ── MaintenanceToggle ──────────────────────────────────────────────────────────

interface MaintenanceToggleProps {
  initialValue: boolean
}

function MaintenanceToggle({ initialValue }: MaintenanceToggleProps) {
  const [isOn, setIsOn] = useState(initialValue)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  useAutoReset(success, () => setSuccess(null))
  useAutoReset(error, () => setError(null))

  function requestToggle() {
    if (!isOn) {
      setConfirming(true)
    } else {
      doToggle(false)
    }
  }

  function doToggle(nextValue: boolean) {
    setConfirming(false)
    startTransition(async () => {
      setError(null)
      setSuccess(null)
      try {
        const res = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ maintenance_mode: nextValue }),
        })
        const json = await res.json()
        if (!res.ok || !json.success) {
          setError(json.error ?? "Error al cambiar el modo de mantenimiento")
          return
        }
        setIsOn(nextValue)
        setSuccess(nextValue ? "Modo mantenimiento activado" : "Modo mantenimiento desactivado")
      } catch {
        setError("Error de red al cambiar el modo de mantenimiento")
      }
    })
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="size-10 rounded-xl bg-[#dc2626]/10 flex items-center justify-center">
          <AlertTriangle className="size-5 text-[#dc2626]" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            Estado de la plataforma
          </p>
          <p className="text-lg font-black text-foreground leading-none mt-0.5">Modo Mantenimiento</p>
        </div>
      </div>

      {isOn && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 mb-4">
          <AlertTriangle className="size-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm font-bold text-red-700">
            Los usuarios no podrán acceder al sistema mientras el modo de mantenimiento esté activo.
          </p>
        </div>
      )}

      {/* Confirmacion inline antes de activar */}
      {confirming && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mb-4">
          <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800 mb-2">
              ¿Activar modo mantenimiento? Los usuarios perderán acceso inmediatamente.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => doToggle(true)}
                className="px-3 py-1 rounded-lg text-xs font-black bg-[#dc2626] text-white"
              >
                Sí, activar
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-3 py-1 rounded-lg text-xs font-black border border-border text-foreground"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">
            {isOn ? "Mantenimiento activo" : "Plataforma operativa"}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {isOn
              ? "El acceso público está bloqueado temporalmente."
              : "El sistema está disponible para todos los usuarios."}
          </p>
        </div>
        <button
          onClick={requestToggle}
          disabled={isPending || confirming}
          aria-label={isOn ? "Desactivar modo mantenimiento" : "Activar modo mantenimiento"}
          className="flex items-center gap-2 px-4 py-2 rounded-full font-black text-sm transition-colors
            disabled:opacity-60 disabled:cursor-not-allowed border"
          style={
            isOn
              ? { background: "#dc2626", color: "#fff", borderColor: "#dc2626" }
              : { background: "#f0f0f0", color: "#0a0a0a", borderColor: "#e5e5e5" }
          }
        >
          {isPending ? (
            <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : isOn ? (
            <ToggleRight className="size-4" />
          ) : (
            <ToggleLeft className="size-4" />
          )}
          {isOn ? "ON" : "OFF"}
        </button>
      </div>

      {error && <p className="text-xs font-bold text-red-600 mt-3">{error}</p>}
      {success && <p className="text-xs font-bold text-emerald-600 mt-3">{success}</p>}
    </div>
  )
}

// ── PlatformInfoForm ───────────────────────────────────────────────────────────

interface PlatformInfoFormProps {
  initialSettings: PlatformSettings
}

function PlatformInfoForm({ initialSettings }: PlatformInfoFormProps) {
  const [version, setVersion] = useState(initialSettings.platform_version ?? "")
  const [region, setRegion] = useState(initialSettings.platform_region ?? "")
  const [currency, setCurrency] = useState(initialSettings.platform_currency ?? "")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useAutoReset(success, () => setSuccess(null))
  useAutoReset(error, () => setError(null))

  function save() {
    startTransition(async () => {
      setError(null)
      setSuccess(null)
      try {
        const res = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform_version: version.trim(),
            platform_region: region.trim(),
            platform_currency: currency.trim(),
          }),
        })
        const json = await res.json()
        if (!res.ok || !json.success) {
          setError(json.error ?? "Error al guardar la configuración")
          return
        }
        setSuccess("Configuración guardada correctamente")
      } catch {
        setError("Error de red al guardar la configuración")
      }
    })
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings className="size-5 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            Información de plataforma
          </p>
          <p className="text-lg font-black text-foreground leading-none mt-0.5">MATCHPOINT</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 block mb-1.5">
            Versión
          </label>
          <input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm font-bold text-foreground
              focus:outline-none focus:border-foreground transition-colors"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 block mb-1.5">
            Región
          </label>
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm font-bold text-foreground
              focus:outline-none focus:border-foreground transition-colors"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 block mb-1.5">
            Moneda
          </label>
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm font-bold text-foreground
              focus:outline-none focus:border-foreground transition-colors"
          />
        </div>
      </div>

      {error && <p className="text-xs font-bold text-red-600 mt-3">{error}</p>}
      {success && <p className="text-xs font-bold text-emerald-600 mt-3">{success}</p>}

      <div className="mt-4 flex justify-end">
        <button
          onClick={save}
          disabled={isPending}
          className="btn-pill flex items-center gap-2 bg-foreground text-background px-5 py-2 text-sm font-black
            disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <span className="size-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Guardar cambios
        </button>
      </div>
    </div>
  )
}

// ── main view ──────────────────────────────────────────────────────────────────

interface AdminSettingsViewProps {
  settings: PlatformSettings
}

export function AdminSettingsView({ settings }: AdminSettingsViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <MaintenanceToggle initialValue={settings.maintenance_mode ?? false} />
      <PlatformInfoForm initialSettings={settings} />
    </div>
  )
}
