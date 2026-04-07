import { authorizeOrRedirect } from "@/features/auth/queries"
import { getCashRegisterToday, getCashSummaryToday } from "@/features/payments/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { CashRegisterManager } from "@/features/payments/components/CashRegisterManager"
import { TrendingUp, TrendingDown, Wallet } from "lucide-react"

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export default async function CashRegisterPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["manager"] })

  const [entries, summary] = await Promise.all([
    getCashRegisterToday(clubId),
    getCashSummaryToday(clubId),
  ])

  const balanceVariant = summary.balance > 0 ? "accent" : "default"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader label="Finanzas" title="Caja del Día" />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Ingresos"
          value={formatCurrency(summary.totalIncome)}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          label="Gastos"
          value={formatCurrency(summary.totalExpense)}
          icon={TrendingDown}
          variant="warning"
        />
        <StatCard
          label="Balance"
          value={formatCurrency(summary.balance)}
          icon={Wallet}
          variant={balanceVariant}
        />
      </div>

      {/* Interactive cash register */}
      <CashRegisterManager clubId={clubId} initialEntries={entries} />
    </div>
  )
}
