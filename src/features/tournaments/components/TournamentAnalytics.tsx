"use client"

import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts"
import { Users, Star, TrendingUp } from "lucide-react"

interface InscriptionPoint {
  date: string
  daily: number
  total: number
}

interface RatingPoint {
  rating: number
  count: number
}

interface AnalyticsData {
  inscriptions_by_day: InscriptionPoint[]
  rating_distribution: RatingPoint[]
  total_participants: number
  max_participants: number
  avg_rating: number | null
  total_feedback: number
  status: string
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className="size-9 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
        <Icon className="size-4 text-foreground" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">{label}</p>
        <p className="text-lg font-black text-foreground leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-zinc-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function formatDate(iso: string) {
  const [, month, day] = iso.split("-")
  return `${day}/${month}`
}

const STAR_COLOR = ["#e11d48", "#f97316", "#eab308", "#22c55e", "#16a34a"]

interface CustomRatingLabelProps {
  x?: number
  y?: number
  width?: number
  value?: number
}

function CustomRatingLabel({ x = 0, y = 0, width = 0, value = 0 }: CustomRatingLabelProps) {
  if (!value) return null
  return (
    <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#52525b">
      {value}
    </text>
  )
}

export function TournamentAnalytics({ tournamentId }: { tournamentId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetch(`/api/tournaments/${tournamentId}/analytics`)
      .then(r => r.json() as Promise<{ success: boolean; data?: AnalyticsData; error?: string }>)
      .then(json => {
        if (json.success && json.data) setData(json.data)
        else setError(json.error ?? "Error al cargar estadísticas")
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false))
  }, [tournamentId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">
        Cargando estadísticas…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
        {error ?? "Sin datos"}
      </div>
    )
  }

  const fillRate = data.max_participants > 0
    ? Math.round((data.total_participants / data.max_participants) * 100)
    : 0

  const ratingColors = data.rating_distribution.map((_, i) => STAR_COLOR[i] ?? "#94a3b8")

  return (
    <div className="flex flex-col gap-5">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={Users}
          label="Inscritos"
          value={`${data.total_participants} / ${data.max_participants}`}
          sub={`${fillRate}% del cupo`}
        />
        <StatCard
          icon={Star}
          label="Valoración"
          value={data.avg_rating !== null ? `${data.avg_rating} ★` : "—"}
          sub={data.total_feedback > 0 ? `${data.total_feedback} reseñas` : "Sin reseñas"}
        />
        <StatCard
          icon={TrendingUp}
          label="Llenado"
          value={`${fillRate}%`}
          sub={data.status === "open" ? "Inscripciones abiertas" : data.status === "completed" ? "Finalizado" : data.status}
        />
      </div>

      {/* Inscriptions timeline */}
      {data.inscriptions_by_day.length > 0 ? (
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">
            Inscripciones acumuladas
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data.inscriptions_by_day} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="inscGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#18181b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 10, fill: "#a1a1aa" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "#a1a1aa" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v) => [v, "Total inscritos"]}
                labelFormatter={(label: unknown) => formatDate(String(label))}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e4e4e7" }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#18181b"
                strokeWidth={2}
                fill="url(#inscGrad)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-400">Sin inscripciones registradas aún</p>
        </div>
      )}

      {/* Rating distribution */}
      {data.total_feedback > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">
            Distribución de valoraciones
          </p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart
              data={data.rating_distribution}
              margin={{ top: 16, right: 4, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="rating"
                tickFormatter={v => `${"★".repeat(v as number)}`}
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "#a1a1aa" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v) => [v, "respuestas"]}
                labelFormatter={(label: unknown) => {
                  const n = Number(label)
                  return `${"★".repeat(n)} (${n} estrellas)`
                }}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e4e4e7" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} label={<CustomRatingLabel />}>
                {data.rating_distribution.map((_, i) => (
                  <Cell key={i} fill={ratingColors[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
