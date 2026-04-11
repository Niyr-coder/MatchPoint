"use client"

import { useState, useTransition } from "react"
import { Shield, ShieldAlert, Download, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ControlTowerKPIs } from "@/lib/admin/queries"

interface Props {
  maintenanceMode: boolean
  kpis: ControlTowerKPIs
}

function exportKPIsCSV(kpis: ControlTowerKPIs) {
  const rows = [
    ["Métrica", "Valor", "Período"],
    ["Usuarios totales", String(kpis.totalUsers), "Acumulado"],
    ["Nuevos este mes", String(kpis.newUsersThisMonth), "Mes actual"],
    ["Activos 7 días", String(kpis.activePlayersThisWeek), "Semana actual"],
    ["Clubs activos", String(kpis.totalClubs), "Acumulado"],
    ["Matches hoy", String(kpis.activeMatchesToday), "Hoy"],
    ["Revenue total", String(kpis.totalRevenue.toFixed(2)), "Acumulado"],
    ["Revenue este mes", String(kpis.revenueThisMonth.toFixed(2)), "Mes actual"],
    ["Torneos", String(kpis.totalTournaments), "Acumulado"],
    ["Tasa de conversión", `${kpis.conversionRate}%`, "Global"],
    ["Pipeline 7 días", String(kpis.pipelineNext7Days), "Próximos 7 días"],
  ]
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `matchpoint-kpis-${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function ControlTowerSystemControls({ maintenanceMode: initial, kpis }: Props) {
  const [maintenance, setMaintenance] = useState(initial)
  const [exported, setExported] = useState(false)
  const [isPending, startTransition] = useTransition()

  const toggleMaintenance = () => {
    startTransition(async () => {
      const next = !maintenance
      try {
        const res = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ maintenance_mode: next }),
        })
        const json = await res.json() as { success: boolean }
        if (json.success) setMaintenance(next)
      } catch { /* silent */ }
    })
  }

  const handleExport = () => {
    exportKPIsCSV(kpis)
    setExported(true)
    setTimeout(() => setExported(false), 2500)
  }

  return (
    <div className="rounded-2xl bg-card border border-border flex flex-col overflow-hidden h-full">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
          Controles del sistema
        </p>
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Maintenance toggle */}
        <div className={cn(
          "flex items-center justify-between rounded-xl border p-3 transition-all",
          maintenance ? "bg-red-50 border-red-200" : "bg-muted/50 border-border"
        )}>
          <div className="flex items-center gap-2">
            {maintenance
              ? <ShieldAlert className="size-4 text-red-600" />
              : <Shield className="size-4 text-zinc-400" />
            }
            <div>
              <p className={cn("text-[11px] font-black", maintenance ? "text-red-700" : "text-zinc-700")}>
                Modo mantenimiento
              </p>
              <p className="text-[9px] text-zinc-400 mt-0.5">
                {maintenance ? "Plataforma en mantenimiento" : "Plataforma operativa"}
              </p>
            </div>
          </div>
          <button
            onClick={toggleMaintenance}
            disabled={isPending}
            className={cn(
              "relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0",
              maintenance ? "bg-red-500" : "bg-zinc-200",
              isPending && "opacity-50"
            )}
          >
            <span className={cn(
              "absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform duration-200",
              maintenance ? "translate-x-5" : "translate-x-0.5"
            )} />
          </button>
        </div>

        {/* Export CSV */}
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 hover:bg-muted px-3 py-3 transition-colors"
        >
          {exported
            ? <CheckCircle className="size-4 text-emerald-500 shrink-0" />
            : <Download className="size-4 text-zinc-400 shrink-0" />
          }
          <div className="text-left">
            <p className="text-[11px] font-black text-zinc-700">
              {exported ? "¡Descargado!" : "Exportar KPIs"}
            </p>
            <p className="text-[9px] text-zinc-400">CSV con métricas actuales</p>
          </div>
        </button>
      </div>
    </div>
  )
}
