import type { SystemHealthData } from "@/lib/admin/queries"
import { AlertTriangle, CheckCircle, XCircle, Clock, Building2, Users } from "lucide-react"
import { cn } from "@/lib/utils"

type Status = "ok" | "warn" | "critical"

interface HealthRow {
  icon: React.ReactNode
  label: string
  value: number
  status: Status
  hint: string
}

function statusColor(s: Status) {
  if (s === "ok")       return "text-emerald-400 bg-emerald-500/10"
  if (s === "warn")     return "text-amber-400 bg-amber-500/10"
  return "text-red-400 bg-red-500/10"
}

function statusDot(s: Status) {
  if (s === "ok")       return "bg-emerald-500"
  if (s === "warn")     return "bg-amber-500"
  return "bg-red-500 animate-pulse"
}

function statusIcon(s: Status) {
  if (s === "ok")       return <CheckCircle className="size-3.5" />
  if (s === "warn")     return <AlertTriangle className="size-3.5" />
  return <XCircle className="size-3.5" />
}

function HealthRow({ icon, label, value, status, hint }: HealthRow) {
  const col = statusColor(status)
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-zinc-800 last:border-0">
      <div className={cn("size-7 rounded-lg flex items-center justify-center shrink-0", col)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-zinc-200">{label}</p>
        <p className="text-[10px] text-zinc-500">{hint}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn("text-sm font-black", col.split(" ")[0])}>{value}</span>
        <div className={cn("size-2 rounded-full", statusDot(status))} />
      </div>
    </div>
  )
}

interface Props {
  health: SystemHealthData
}

export function ControlTowerSystemHealth({ health }: Props) {
  const rows: HealthRow[] = [
    {
      icon: <Users className="size-3.5" />,
      label: "Usuarios suspendidos",
      value: health.suspendedUsers,
      status: health.suspendedUsers === 0 ? "ok" : health.suspendedUsers < 5 ? "warn" : "critical",
      hint: "Cuentas con restricciones activas",
    },
    {
      icon: <Clock className="size-3.5" />,
      label: "Solicitudes de club",
      value: health.pendingClubRequests,
      status: health.pendingClubRequests === 0 ? "ok" : health.pendingClubRequests < 3 ? "warn" : "critical",
      hint: "Pendientes de aprobación",
    },
    {
      icon: <XCircle className="size-3.5" />,
      label: "Cancelaciones hoy",
      value: health.cancelledReservationsToday,
      status: health.cancelledReservationsToday === 0 ? "ok" : health.cancelledReservationsToday < 5 ? "warn" : "critical",
      hint: "Reservas canceladas hoy",
    },
    {
      icon: <Building2 className="size-3.5" />,
      label: "Clubs inactivos",
      value: health.inactiveClubs,
      status: health.inactiveClubs === 0 ? "ok" : health.inactiveClubs < 5 ? "warn" : "critical",
      hint: "Sin actividad o desactivados",
    },
  ]

  const criticalCount = rows.filter((r) => r.status === "critical").length
  const warnCount = rows.filter((r) => r.status === "warn").length
  const overallStatus: Status =
    criticalCount > 0 ? "critical" : warnCount > 0 ? "warn" : "ok"

  const overallLabel = {
    ok: "Sistemas operativos",
    warn: "Atención requerida",
    critical: "Acción inmediata",
  }[overallStatus]

  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
          Estado del sistema
        </p>
        <div className="flex items-center gap-1.5">
          <span className={cn(statusIcon(overallStatus), statusColor(overallStatus).split(" ")[0])} />
          <span className={cn("text-[10px] font-black uppercase tracking-wider", statusColor(overallStatus).split(" ")[0])}>
            {overallLabel}
          </span>
        </div>
      </div>

      {/* Rows */}
      <div className="px-4 py-1 flex-1">
        {rows.map((row) => (
          <HealthRow key={row.label} {...row} />
        ))}
      </div>
    </div>
  )
}
