import { authorizeOrRedirect } from "@/features/auth/queries"
import { getAdminControlTowerData } from "@/lib/admin/queries"
import { ControlTowerKPIs } from "@/components/admin/ControlTowerKPIs"
import { ControlTowerActivityFeed } from "@/components/admin/ControlTowerActivityFeed"
import { ControlTowerGrowthCharts } from "@/components/admin/ControlTowerGrowthCharts"
import { ControlTowerSystemHealth } from "@/components/admin/ControlTowerSystemHealth"
import { ControlTowerRankings } from "@/components/admin/ControlTowerRankings"
import { ControlTowerRevenue } from "@/components/admin/ControlTowerRevenue"
import { ControlTowerQuickActions } from "@/components/admin/ControlTowerQuickActions"

export default async function AdminDashboardPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })
  const data = await getAdminControlTowerData()

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-zinc-900 uppercase tracking-[-0.02em]">
            Torre de Control
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-0.5">
            MATCHPOINT · Admin Dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
            Sistema activo
          </span>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <ControlTowerKPIs kpis={data.kpis} />

      {/* Row 2: Activity Feed + Growth Charts + System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Activity Feed — tall */}
        <div className="lg:col-span-3 flex flex-col" style={{ minHeight: 340 }}>
          <ControlTowerActivityFeed initialFeed={data.activityFeed} />
        </div>

        {/* Growth Charts */}
        <div className="lg:col-span-5 flex flex-col" style={{ minHeight: 340 }}>
          <ControlTowerGrowthCharts growthData={data.growthData} />
        </div>

        {/* System Health */}
        <div className="lg:col-span-4 flex flex-col">
          <ControlTowerSystemHealth health={data.systemHealth} />
        </div>
      </div>

      {/* Row 3: Rankings + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <ControlTowerRankings
            topClubs={data.topClubs}
            topPlayers={data.topPlayers}
            topTournaments={data.topTournaments}
          />
        </div>
        <div className="lg:col-span-5">
          <ControlTowerRevenue revenue={data.revenue} />
        </div>
      </div>

      {/* Row 4: Quick Actions */}
      <ControlTowerQuickActions />
    </div>
  )
}
