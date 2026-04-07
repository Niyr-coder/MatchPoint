import { authorizeOrRedirect } from "@/features/auth/queries"
import { getCashRegisterToday, getCashSummaryToday } from "@/features/payments/queries"
import { CashRegisterManager } from "@/features/payments/components/CashRegisterManager"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { Wallet, TrendingUp, TrendingDown } from "lucide-react"

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export default async function EmployeeCashRegisterPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["employee"] })

  const [entries, summary] = await Promise.all([
    getCashRegisterToday(clubId),
    getCashSummaryToday(clubId),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="Empleado · Caja"
        title="Caja Registradora"
        description="Registro de cobros y pagos del día"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Balance del Día"
          value={formatCurrency(summary.balance)}
          icon={Wallet}
          variant={summary.balance >= 0 ? "success" : "warning"}
        />
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
      </div>

      <CashRegisterManager clubId={clubId} initialEntries={entries} />
    </div>
  )
}
