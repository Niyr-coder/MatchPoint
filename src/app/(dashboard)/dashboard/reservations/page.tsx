import Link from "next/link"
import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getAllUserReservations, getReservationInvites } from "@/lib/reservations/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { ReservationsList } from "@/components/reservations/ReservationsList"

export default async function ReservationsPage() {
  const ctx = await authorizeOrRedirect()
  const userId = ctx.userId

  const [reservations, invites] = await Promise.all([
    getAllUserReservations(userId).catch(() => []),
    getReservationInvites(userId).catch(() => []),
  ])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        label="Mis Reservas"
        title="Reservas"
        action={
          <Link
            href="/dashboard/reservations/new"
            className="bg-[#0a0a0a] text-white rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] hover:bg-zinc-800 transition-colors"
          >
            + Nueva Reserva
          </Link>
        }
      />
      <ReservationsList reservations={reservations} invites={invites} />
    </div>
  )
}
