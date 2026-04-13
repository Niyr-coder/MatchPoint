import { authorizeOrRedirect } from "@/features/auth/queries"
import { CashRegisterPageShell } from "@/features/payments/components/CashRegisterPageShell"

export default async function EmployeeCashRegisterPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["employee"] })
  return (
    <CashRegisterPageShell
      clubId={clubId}
      config={{
        label: "Empleado · Caja",
        title: "Caja Registradora",
        description: "Registro de cobros y pagos del día",
        statOrder: "balance-income-expense",
        balanceVariant: "lenient",
      }}
    />
  )
}
