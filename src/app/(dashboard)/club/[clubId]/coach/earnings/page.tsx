import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getCoachEarnings, getCoachEarningsSummary } from "@/lib/coach/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { DataTable } from "@/components/shared/DataTable"
import { EmptyState } from "@/components/shared/EmptyState"
import { DollarSign, Users } from "lucide-react"
import type { EarningEntry } from "@/lib/coach/queries"
import type { Column } from "@/components/shared/DataTable"

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

const columns: Column<EarningEntry>[] = [
  {
    key: "date",
    header: "Fecha",
    render: (item) => (
      <span className="text-zinc-500">{formatDate(item.date)}</span>
    ),
  },
  {
    key: "description",
    header: "Descripción",
    render: (item) => (
      <span className="text-[#0a0a0a] font-medium">{item.description}</span>
    ),
  },
  {
    key: "amount",
    header: "Monto",
    render: (item) => (
      <span className="text-[#16a34a] font-black">{formatCurrency(item.amount)}</span>
    ),
  },
]

export default async function EarningsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["coach"] })

  const [earnings, summary] = await Promise.all([
    getCoachEarnings(ctx.userId, clubId),
    getCoachEarningsSummary(ctx.userId, clubId),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader label="Finanzas" title="Mis Ganancias" />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Ganancias del Mes"
          value={formatCurrency(summary.totalThisMonth)}
          icon={DollarSign}
          variant="accent"
        />
        <StatCard
          label="Total Acumulado"
          value={formatCurrency(summary.totalAllTime)}
          icon={DollarSign}
          variant="default"
        />
        <StatCard
          label="Total Estudiantes"
          value={summary.studentsCount}
          icon={Users}
          variant="default"
        />
      </div>

      {/* Earnings table */}
      {earnings.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="Aún no hay ganancias registradas"
          description="Tus ganancias aparecerán aquí cuando sean registradas por el club."
        />
      ) : (
        <DataTable
          columns={columns}
          data={earnings}
          keyExtractor={(item) => item.id}
        />
      )}
    </div>
  )
}
