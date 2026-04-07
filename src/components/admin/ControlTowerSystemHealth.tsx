import type { SystemHealthData } from "@/lib/admin/queries"
import { AlertTriangle, CheckCircle, XCircle, Clock, Building2, Users } from "lucide-react"
import { cn } from "@/lib/utils"

type Status = "ok" | "warn" | "critical"

interface HealthRowData {
  icon: React.ReactNode
  label: string
  value: number
  status: Status
  hint: string
}

const STATUS_STYLES: Record<Status, { icon: string; bg: string; count: string }> = {
  ok:       { icon: "text-emerald-600", bg: "bg-emerald-50",  count: "text-emerald-600" },
  warn:     { icon: "text-amber-600",   bg: "bg-amber-50",    count: "text-amber-600" },
  critical: { icon: "text-red-600",     bg: "bg-red-50",      count: "text-red-600" },
}

function HealthRow({ icon, label, value, status, hint }: HealthRowData) {
  const s = STATUS_STYLES[status]
  const StatusIcon = status === "ok" ? CheckCircle : status === "warn" ? AlertTriangle : XCircle
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-zinc-100 last:border-0">
      <div className={cn("size-7 rounded-lg flex items-center justify-center shrink-0", s.bg, s.icon)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-zinc-800 leading-snug">{label}</p>
        <p className="text-[10px] text-zinc-400">{hint}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={cn("text-sm font-black tabular-nums", s.count)}>{value}</span>
        <StatusIcon className={cn("size-3", s.icon)} />
      </div>
    </div>
  )
}

interface Props {
  health: SystemHealthData
}

export function ControlTowerSystemHealth({ health }: Props) {
  const rows: HealthRowData[] = [
    {
      icon: <Users className="size-3.5" />,
      label: "Usuarios suspendidos",
      value: health.suspendedUsers,
      status: health.suspendedUsers === 0 ? "ok" : health.suspendedUsers < 5 ? "warn" : "critical",
      hint: "Cuentas con restricciones",
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
  const overallStatus: Status = criticalCount > 0 ? "critical" : warnCount > 0 ? "warn" : "ok"
  const overallDotColor = { ok: "bg-emerald-500", warn: "bg-amber-500", critical: "bg-red-500 animate-pulse" }[overallStatus]

  return (
    <div className="rounded-2xl bg-white flex flex-col overflow-hidden h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0">
        <div className={cn("size-2 rounded-full shrink-0", overallDotColor)} />
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
          Estado del sistema
        </p>
      </div>
      <div className="px-4 py-1 flex-1">
        {rows.map((row) => (
          <HealthRow key={row.label} {...row} />
        ))}
      </div>
    </div>
  )
}
