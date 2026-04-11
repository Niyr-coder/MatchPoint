import { authorizeOrRedirect } from "@/features/auth/queries"
import { getRankingBySport } from "@/features/ratings/queries"
import { RankingView } from "@/features/ratings/components/RankingView"
import { PageHeader } from "@/components/shared/PageHeader"
import { VISIBLE_SPORT_IDS } from "@/lib/sports/config"

export default async function RankingPage() {
  await authorizeOrRedirect()

  const [all, ...sportResults] = await Promise.all([
    getRankingBySport(undefined, 200),
    ...VISIBLE_SPORT_IDS.map((sport) => getRankingBySport(sport, 50)),
  ])

  const bySport = VISIBLE_SPORT_IDS.map((sport, i) => ({
    sport,
    entries: sportResults[i],
  }))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader label="Competencia" title="Ranking" description="Clasificación de jugadores por deporte" />

      <RankingView all={all} bySport={bySport} />
    </div>
  )
}
