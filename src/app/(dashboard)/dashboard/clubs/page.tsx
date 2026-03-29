import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getClubs, getDistinctProvinces } from "@/lib/clubs/queries"
import { ClubsView } from "@/components/dashboard/ClubsView"
import { Building2 } from "lucide-react"

export default async function ClubsPage() {
  await authorizeOrRedirect()

  const [clubs, provinces] = await Promise.all([
    getClubs(),
    getDistinctProvinces(),
  ])

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">
          Explora
        </p>
        <h1 className="text-3xl font-black uppercase tracking-[-0.03em] text-[#0a0a0a]">
          Clubes Deportivos
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Encuentra clubes cerca de ti
        </p>
      </div>

      {clubs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 border border-dashed border-zinc-300 rounded-2xl">
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
