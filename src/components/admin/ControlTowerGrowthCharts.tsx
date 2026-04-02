"use client"

import { useState } from "react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type ChartTab = "users" | "matches" | "revenue"

interface GrowthData {
  usersByMonth: Array<{ month: string; users: number }>
  matchesByMonth: Array<{ month: string; matches: number }>
  revenueByMonth: Array<{ month: string; revenue: number }>
}

const TABS: Array<{ key: ChartTab; label: string; stroke: string; fill: string }> = [
  { key: "users",   label: "Usuarios", stroke: "#16a34a", fill: "#16a34a" },
  { key: "matches", label: "Matches",  stroke: "#0ea5e9", fill: "#0ea5e9" },
  { key: "revenue", label: "Revenue",  stroke: "#f59e0b", fill: "#f59e0b" },
]

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const isRevenue = item.name === "revenue"
  return (
    <div className="bg-white border border-zinc-200 rounded-xl px-3 py-2 shadow-lg">
      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="text-sm font-black text-zinc-900">
        {isRevenue ? `$${Number(item.value).toFixed(0)}` : item.value}
      </p>
    </div>
  )
}

interface Props {
  growthData: GrowthData
}

export function ControlTowerGrowthCharts({ growthData }: Props) {
  const [activeTab, setActiveTab] = useState<ChartTab>("users")

  const tab = TABS.find((t) => t.key === activeTab)!

  type ChartPoint = { month: string; [key: string]: number | string }

  const data: ChartPoint[] =
    activeTab === "users"
      ? growthData.usersByMonth
      : activeTab === "matches"
        ? growthData.matchesByMonth
        : growthData.revenueByMonth

  const dataKey = activeTab

  return (
    <div className="rounded-2xl bg-white border border-zinc-200 flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
          Crecimiento · 6 meses
        </p>
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all ${
                activeTab === t.key
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-4 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === "revenue" ? (
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
              <Bar dataKey={dataKey} fill={tab.fill} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id={`grad-${activeTab}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={tab.fill} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={tab.fill} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={tab.stroke}
                strokeWidth={2}
                fill={`url(#grad-${activeTab})`}
                dot={{ fill: tab.stroke, r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: tab.stroke }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
