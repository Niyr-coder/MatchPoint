"use client"

import { useState, useTransition } from "react"
import {
  Settings,
  Building2,
  Users,
  Trophy,
  DollarSign,
  Shield,
  BarChart3,
  Database,
  Lock,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Save,
  ToggleLeft,
  ToggleRight,
  Volleyball,
  CircleDot,
  Baseline,
  Zap,
} from "lucide-react"
import Link from "next/link"
import type { PlatformSettings } from "@/app/api/admin/settings/route"

// ── constants ──────────────────────────────────────────────────────────────────

const SPORTS = [
  {
    name: "Fútbol 7",
    icon: Volleyball,
    modalities: ["5 vs 5", "7 vs 7", "Mixto"],
    color: "bg-emerald-50 text-emerald-700",
    iconColor: "text-emerald-600",
  },
  {
    name: "Pádel",
    icon: Baseline,
    modalities: ["Individual", "Dobles", "Mixto"],
    color: "bg-violet-50 text-violet-700",
    iconColor: "text-violet-600",
  },
  {
    name: "Tenis",
    icon: CircleDot,
    modalities: ["Individual", "Dobles", "Mixto"],
    color: "bg-yellow-50 text-yellow-700",
    iconColor: "text-yellow-600",
  },
  {
    name: "Pickleball",
    icon: Zap,
    modalities: ["Individual", "Dobles", "Mixto"],
    color: "bg-orange-50 text-orange-700",
    iconColor: "text-orange-600",
  },
]

const QUICK_LINKS = [
  { label: "Gestión de Clubs", href: "/admin/clubs", icon: Building2, desc: "Ver y administrar todos los clubs" },
  { label: "Gestión de Usuarios", href: "/admin/users", icon: Users, desc: "Ver y administrar usuarios globales" },
  { label: "Torneos", href: "/admin/tournaments", icon: Trophy, desc: "Supervisar torneos en la plataforma" },
  { label: "Financiero", href: "/admin/financials", icon: DollarSign, desc: "Ingresos y movimientos financieros" },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, desc: "Estadísticas y tendencias globales" },
  { label: "Moderación", href: "/admin/moderation", icon: Shield, desc: "Revisar usuarios y clubs pendientes" },
]

const STATUS_SERVICES = [
  { label: "Base de datos", icon: Database },
  { label: "Autenticación", icon: Lock },
  { label: "Almacenamiento", icon: HardDrive },
]

// ── sub-components ─────────────────────────────────────────────────────────────

interface MaintenanceToggleProps {
  initialValue: boolean
}

function MaintenanceToggle({ initialValue }: MaintenanceToggleProps) {
  const [isOn, setIsOn] = useState(initialValue)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function toggle() {
    const nextValue = !isOn
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
          onClick={toggle}
          disabled={isPending}
          aria-label={isOn ? "Desactivar modo mantenimiento" : "Activar modo mantenimiento"}
          className="flex items-center gap-2 px-4 py-2 rounded-full font-black text-sm transition-colors disabled:opacity-60
            disabled:cursor-not-allowed border"
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

// ── platform info form ─────────────────────────────────────────────────────────

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
        <div className="size-10 rounded-xl bg-[#dc2626]/10 flex items-center justify-center">
          <Settings className="size-5 text-[#dc2626]" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            Información de plataforma
          </p>
          <p className="text-lg font-black text-foreground leading-none mt-0.5">MATCHPOINT</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border-subtle">
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

      {/* Sports — static, informational */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">
          Deportes activos
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SPORTS.map((sport) => {
            const Icon = sport.icon
            return (
              <div key={sport.name} className="rounded-xl border border-border-subtle p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`size-4 ${sport.iconColor}`} />
                  <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${sport.color}`}>
                    {sport.name}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {sport.modalities.map((mod) => (
                    <p key={mod} className="text-[11px] text-zinc-500 font-medium">
                      · {mod}
                    </p>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick links */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">
          Accesos rápidos
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-xl border border-border-subtle p-4 hover:border-border
                hover:bg-secondary transition-colors group"
            >
              <div className="size-9 rounded-xl bg-muted flex items-center justify-center shrink-0
                group-hover:bg-[#dc2626]/10 transition-colors">
                <link.icon className="size-4 text-zinc-500 group-hover:text-[#dc2626] transition-colors" />
              </div>
              <div>
                <p className="text-sm font-black text-foreground">{link.label}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Service status */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">
          Estado de los servicios
        </p>
        <div className="flex flex-col divide-y divide-border-subtle">
          {STATUS_SERVICES.map((svc) => (
            <div key={svc.label} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <svc.icon className="size-4 text-zinc-400" />
                <p className="text-sm font-bold text-foreground">{svc.label}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-black text-primary">
                <CheckCircle2 className="size-3.5" />
                Operativo
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
