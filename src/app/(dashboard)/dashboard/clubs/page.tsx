import { authorizeOrRedirect } from "@/features/auth/queries"
import { getClubs, getDistinctProvinces } from "@/features/clubs/queries/clubs"
import { ClubsView } from "@/features/clubs/components/ClubsView"
import { PageHeader } from "@/components/shared/PageHeader"
import { Building2 } from "lucide-react"

export default async function ClubsPage() {
  await authorizeOrRedirect()

  const [clubs, provinces] = await Promise.all([
    getClubs(),
    getDistinctProvinces(),
  ])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader label="Explora" title="Clubes Deportivos" description="Encuentra clubes cerca de ti" />

      {clubs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 border border-dashed border-border rounded-2xl">
          <Building2 className="size-10 text-zinc-300" />
          <p className="text-sm font-bold text-zinc-400">No hay clubes registrados aún</p>
          <p className="text-xs text-zinc-300">Vuelve pronto para descubrir nuevos clubes</p>
        </div>
      ) : (
        <ClubsView clubs={clubs} provinces={provinces} />
      )}
    </div>
  )
}
