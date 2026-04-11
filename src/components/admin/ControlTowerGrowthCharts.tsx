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
type Period = "3M" | "6M" | "1A"

interface GrowthData {
  usersByMonth: Array<{ month: string; users: number; prevUsers: number }>
  matchesByMonth: Array<{ month: string; matches: number; prevMatches: number }>
  revenueByMonth: Array<{ month: string; revenue: number; prevRevenue: number }>
}

const TABS: Array<{ key: ChartTab; label: string; stroke: string; fill: string }> = [
  { key: "users",   label: "Usuarios", stroke: "#16a34a", fill: "#16a34a" },
  { key: "matches", label: "Matches",  stroke: "#0ea5e9", fill: "#0ea5e9" },
  { key: "revenue", label: "Revenue",  stroke: "#f59e0b", fill: "#f59e0b" },
]

const PERIODS: Array<{ key: Period; label: string; months: number }> = [
  { key: "3M", label: "3M",  months: 3 },
  { key: "6M", label: "6M",  months: 6 },
  { key: "1A", label: "1A",  months: 12 },
]

const fmt = (value: number, isRevenue: boolean) =>
  isRevenue ? `$${Number(value).toFixed(0)}` : String(value)

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  const isRevenue = payload[0]?.name === "revenue" || payload[0]?.name === "prevRevenue"
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg space-y-1">
      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{label}</p>
      {payload.map((item) => {
        const isPrev = item.name.startsWith("prev")
        return (
          <div key={item.name} className="flex items-center gap-1.5">
            <span
              className="inline-block size-1.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[10px] text-zinc-500">{isPrev ? "Período ant." : "Actual"}</span>
            <span className="text-xs font-black text-foreground ml-auto pl-3">
              {fmt(item.value, isRevenue)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

interface Props {
  growthData: GrowthData
}

export function ControlTowerGrowthCharts({ growthData }: Props) {
  const [activeTab, setActiveTab] = useState<ChartTab>("users")
  const [period, setPeriod] = useState<Period>("6M")

  const tab = TABS.find((t) => t.key === activeTab)!
  const months = PERIODS.find((p) => p.key === period)!.months

  type ChartPoint = { month: string; [key: string]: number | string }

  const allData: ChartPoint[] =
    activeTab === "users"
      ? growthData.usersByMonth
      : activeTab === "matches"
        ? growthData.matchesByMonth
        : growthData.revenueByMonth

  // Slice to selected period (last N months)
  const data = allData.slice(-months)

  const dataKey = activeTab
  const prevDataKey = activeTab === "users" ? "prevUsers" : activeTab === "matches" ? "prevMatches" : "prevRevenue"

  return (
    <div className="rounded-2xl bg-card border border-border flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
          Crecimiento
        </p>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md transition-all ${
                  period === p.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Chart type tabs */}
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all ${
                  activeTab === t.key
                    ? "bg-secondary text-foreground"
                    : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
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
              <Bar dataKey={prevDataKey} fill={tab.fill} fillOpacity={0.25} radius={[4, 4, 0, 0]} maxBarSize={40} />
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
                dataKey={prevDataKey}
                stroke={tab.stroke}
                strokeOpacity={0.35}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                fill="none"
                dot={false}
                activeDot={false}
              />
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
