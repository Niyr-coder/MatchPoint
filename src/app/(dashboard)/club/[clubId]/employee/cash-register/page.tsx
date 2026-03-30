import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Wallet } from "lucide-react"

export default async function EmployeeCashRegisterPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["employee", "manager", "owner"] })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="EMPLEADO · CAJA"
        title="Caja Registradora"
        description="Registro de cobros y pagos del día"
      />
      <EmptyState
        icon={Wallet}
        title="Caja disponible próximamente"
        description="Aquí podrás registrar los cobros, pagos y movimientos de caja durante tu turno."
      />
    </div>
  )
}
