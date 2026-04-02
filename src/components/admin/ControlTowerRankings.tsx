import type { ControlTowerRanking } from "@/lib/admin/queries"
import { Building2, User, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

interface RankListProps {
  title: string
  icon: React.ReactNode
  items: ControlTowerRanking[]
  valueLabel: string
  accent: string
}

function RankList({ title, icon, items, valueLabel, accent }: RankListProps) {
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className={cn("size-6 rounded-lg flex items-center justify-center text-white", accent)}>
          {icon}
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{title}</p>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-zinc-600 py-2">Sin datos</p>
        ) : (
          items.map((item, i) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="text-[10px] font-black text-zinc-600 w-4 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold text-zinc-200 truncate pr-2">{item.name}</span>
                  <span className="text-[10px] font-black text-zinc-400 shrink-0">
                    {item.value} {valueLabel}
                  </span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", accent)}
                    style={{ width: `${(item.value / max) * 100}%` }}
                  />
                </div>
                {item.secondary && (
                  <p className="text-[9px] text-zinc-600 mt-0.5">{item.secondary}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

interface Props {
  topClubs: ControlTowerRanking[]
  topPlayers: ControlTowerRanking[]
  topTournaments: ControlTowerRanking[]
}

export function ControlTowerRankings({ topClubs, topPlayers, topTournaments }: Props) {
  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Top Rankings</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
        <div className="p-4">
          <RankList
            title="Clubs más activos"
            icon={<Building2 className="size-3" />}
            items={topClubs}
            valueLabel="matches"
            accent="bg-amber-500"
          />
        </div>
        <div className="p-4">
          <RankList
            title="Jugadores top"
            icon={<User className="size-3" />}
            items={topPlayers}
            valueLabel="partidos"
            accent="bg-sky-500"
          />
        </div>
        <div className="p-4">
          <RankList
            title="Torneos top"
            icon={<Trophy className="size-3" />}
            items={topTournaments}
            valueLabel="jugadores"
            accent="bg-violet-500"
          />
        </div>
      </div>
    </div>
  )
}
