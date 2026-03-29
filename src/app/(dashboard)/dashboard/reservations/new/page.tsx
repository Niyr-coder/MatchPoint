import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { ReservationWizard } from "@/components/reservations/ReservationWizard"

export default async function NewReservationPage() {
  await authorizeOrRedirect()

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        label="Nueva Reserva"
        title="Reservar Cancha"
      />
      <ReservationWizard />
    </div>
  )
}
