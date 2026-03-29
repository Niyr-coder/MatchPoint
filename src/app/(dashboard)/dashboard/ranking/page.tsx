import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getRankingBySport } from "@/lib/rankings/queries"
import { RankingView } from "@/components/dashboard/RankingView"

const SPORTS = ["futbol", "padel", "tenis", "pickleball"]

export default async function RankingPage() {
  await authorizeOrRedirect()

  const [all, ...sportResults] = await Promise.all([
    getRankingBySport(undefined, 50),
    ...SPORTS.map((sport) => getRankingBySport(sport, 50)),
  ])

  const bySport = SPORTS.map((sport, i) => ({
    sport,
    entries: sportResults[i],
  }))

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">
          Competencia
        </p>
        <h1 className="text-3xl font-black uppercase tracking-[-0.03em] text-[#0a0a0a]">
          Ranking
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Clasificación de jugadores por deporte
        </p>
      </div>

      <RankingView all={all} bySport={bySport} />
    </div>
  )
}
