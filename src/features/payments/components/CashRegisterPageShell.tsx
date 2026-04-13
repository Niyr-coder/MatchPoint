import { TrendingUp, TrendingDown, Wallet } from "lucide-react"
import { getCashRegisterToday, getCashSummaryToday } from "@/features/payments/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { CashRegisterManager } from "@/features/payments/components/CashRegisterManager"

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

interface CashRegisterPageConfig {
  label: string
  title: string
  description?: string
  /** Stat card order. Defaults to manager style: income → expense → balance */
  statOrder?: "income-expense-balance" | "balance-income-expense"
  /** How to compute balance variant. Defaults to manager style (strict positive = accent) */
  balanceVariant?: "strict" | "lenient"
}

interface CashRegisterPageShellProps {
  clubId: string
  config: CashRegisterPageConfig
}

/**
 * Shared shell for cash-register pages across roles.
 * Each role page provides auth guard + config, this provides data fetching + UI.
 */
export async function CashRegisterPageShell({ clubId, config }: CashRegisterPageShellProps) {
  const {
    label,
    title,
    description,
    statOrder = "income-expense-balance",
    balanceVariant = "strict",
  } = config

  const [entries, summary] = await Promise.all([
    getCashRegisterToday(clubId),
    getCashSummaryToday(clubId),
  ])

  const balanceCardVariant =
    balanceVariant === "strict"
      ? summary.balance > 0 ? "accent" : "default"
      : summary.balance >= 0 ? "success" : "warning"

  const incomeCard = (
    <StatCard label="Ingresos" value={formatCurrency(summary.totalIncome)} icon={TrendingUp} variant="success" />
  )
  const expenseCard = (
    <StatCard label="Gastos" value={formatCurrency(summary.totalExpense)} icon={TrendingDown} variant="warning" />
  )
  const balanceCard = (
    <StatCard
      label={statOrder === "balance-income-expense" ? "Balance del Día" : "Balance"}
      value={formatCurrency(summary.balance)}
      icon={Wallet}
      variant={balanceCardVariant}
    />
  )

  const stats =
    statOrder === "balance-income-expense"
      ? [balanceCard, incomeCard, expenseCard]
      : [incomeCard, expenseCard, balanceCard]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader label={label} title={title} description={description} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((card, i) => (
          <div key={i}>{card}</div>
        ))}
      </div>

      <CashRegisterManager clubId={clubId} initialEntries={entries} />
    </div>
  )
}
