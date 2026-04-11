import Link from "next/link"
import { AlertTriangle, XCircle, Info, CheckCircle, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SmartAlert, AlertSeverity, SystemHealthData } from "@/lib/admin/queries"

const SEV: Record<AlertSeverity, { icon: React.ReactNode; bg: string; border: string; label: string; dot: string }> = {
  critical: {
    icon: <XCircle className="size-3.5" />,
    bg: "bg-red-50",
    border: "border-red-100",
    label: "text-red-700",
    dot: "bg-red-500 animate-pulse",
  },
  warn: {
    icon: <AlertTriangle className="size-3.5" />,
    bg: "bg-amber-50",
    border: "border-amber-100",
    label: "text-amber-700",
    dot: "bg-amber-500",
  },
  info: {
    icon: <Info className="size-3.5" />,
    bg: "bg-sky-50",
    border: "border-sky-100",
    label: "text-sky-700",
    dot: "bg-sky-400",
  },
}

interface Props {
  alerts: SmartAlert[]
  health: SystemHealthData
}

export function ControlTowerAlerts({ alerts, health }: Props) {
  const criticalCount = alerts.filter((a) => a.severity === "critical").length
  const warnCount = alerts.filter((a) => a.severity === "warn").length
  const headerDot = criticalCount > 0 ? "bg-red-500 animate-pulse" : warnCount > 0 ? "bg-amber-500" : "bg-emerald-500"

  return (
    <div className="rounded-2xl bg-card border border-border flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className={cn("size-2 rounded-full shrink-0", headerDot)} />
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
            Alertas del sistema
          </p>
        </div>
        {alerts.length > 0 && (
          <span className="text-[10px] font-black text-zinc-400">
            {alerts.length} alerta{alerts.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <CheckCircle className="size-6 text-emerald-500" />
            <p className="text-xs font-black text-emerald-600 uppercase tracking-wide">Todo en orden</p>
            <p className="text-[10px] text-zinc-400 text-center leading-relaxed">
              No hay alertas activas en este momento.
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const s = SEV[alert.severity]
            return (
              <div
                key={alert.id}
                className={cn(
                  "rounded-xl border p-3 flex gap-2.5",
                  s.bg,
                  s.border
                )}
              >
                <span className={cn("mt-0.5 shrink-0", s.label)}>{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[11px] font-black leading-snug", s.label)}>
                    {alert.title}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">
                    {alert.description}
                  </p>
                  {alert.actionHref && (
                    <Link
                      href={alert.actionHref}
                      className={cn(
                        "inline-flex items-center gap-1 mt-1.5 text-[10px] font-black uppercase tracking-wide",
                        s.label
                      )}
                    >
                      {alert.actionLabel ?? "Ver más"}
                      <ArrowRight className="size-2.5" />
                    </Link>
                  )}
                </div>
              </div>
            )
          })
        )}

        {/* System health mini-summary */}
        <div className="pt-2 border-t border-zinc-100 mt-2 space-y-1.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Estado operacional</p>
          {[
            { label: "Suspendidos", value: health.suspendedUsers, warn: 1 },
            { label: "Solicitudes pendientes", value: health.pendingClubRequests, warn: 1 },
            { label: "Cancelaciones hoy", value: health.cancelledReservationsToday, warn: 3 },
            { label: "Clubs inactivos", value: health.inactiveClubs, warn: 3 },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">{row.label}</span>
              <span className={cn(
                "text-[10px] font-black tabular-nums",
                row.value === 0 ? "text-emerald-600" : row.value < row.warn * 2 ? "text-amber-600" : "text-red-600"
              )}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
