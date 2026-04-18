import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import Link from 'next/link'
import { authorizeOrRedirect } from '@/features/auth/queries'
import { makeQueryClient } from '@/lib/query/client'
import { prefetchUserBookings } from '@/features/bookings/prefetch'
import { PageHeader } from '@/components/shared/PageHeader'
import { ReservationsPageClient } from '@/features/bookings/components/ReservationsPageClient'

export default async function ReservationsPage() {
  const ctx = await authorizeOrRedirect()

  const queryClient = makeQueryClient()
  await prefetchUserBookings(queryClient, ctx.userId)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        label="Mis Reservas"
        title="Reservas"
        action={
          <Link
            href="/dashboard/reservations/new"
            className="bg-foreground text-background rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] hover:bg-foreground/90 transition-colors"
          >
            + Nueva Reserva
          </Link>
        }
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ReservationsPageClient userId={ctx.userId} />
      </HydrationBoundary>
    </div>
  )
}
