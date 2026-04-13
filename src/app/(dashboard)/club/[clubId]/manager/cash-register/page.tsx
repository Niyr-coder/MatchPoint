import { authorizeOrRedirect } from "@/features/auth/queries"
import { CashRegisterPageShell } from "@/features/payments/components/CashRegisterPageShell"

export default async function CashRegisterPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["manager"] })
  return (
    <CashRegisterPageShell
      clubId={clubId}
      config={{ label: "Finanzas", title: "Caja del Día", statOrder: "income-expense-balance", balanceVariant: "strict" }}
    />
  )
}
