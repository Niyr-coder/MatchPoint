import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { authorizeOrRedirect } from '@/features/auth/queries'
import { makeQueryClient } from '@/lib/query/client'
import { prefetchTournamentsList } from '@/features/tournaments/prefetch'
import { PageHeader } from '@/components/shared/PageHeader'
import { TournamentsPageClient } from '@/features/tournaments/components/TournamentsPageClient'
import { Swords, Plus } from 'lucide-react'
import Link from 'next/link'

export default async function TournamentsPage() {
  const ctx = await authorizeOrRedirect()
  const { canOrganize } = await import('@/features/organizer/permissions')
  const isOrganizer = await canOrganize(ctx)

  const queryClient = makeQueryClient()
  await prefetchTournamentsList(queryClient, ctx.userId)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        label="Competencias"
        title="Torneos"
        action={
          <div className="flex items-center gap-2">
            {isOrganizer && (
              <Link
                href="/dashboard/organizer/new"
                className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] px-4 py-2 border border-foreground text-foreground rounded-full hover:bg-foreground hover:text-white transition-colors"
              >
                <Swords className="size-3.5" />
                Organizar quedada
              </Link>
            )}
            <Link
              href="/dashboard/tournaments/create"
              className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] px-4 py-2 bg-foreground text-white rounded-full hover:bg-foreground/90 transition-colors"
            >
              <Plus className="size-3.5" />
              Crear Torneo
            </Link>
          </div>
        }
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <TournamentsPageClient userId={ctx.userId} />
      </HydrationBoundary>
    </div>
  )
}
