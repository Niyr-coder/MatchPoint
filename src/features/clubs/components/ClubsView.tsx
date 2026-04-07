"use client"

import { useState, useMemo } from "react"
import { Search, Building2 } from "lucide-react"
import { ClubCard } from "./ClubCard"
import type { ClubWithSports } from "@/features/clubs/queries/clubs"
import { VISIBLE_SPORT_OPTIONS, SINGLE_SPORT_MODE } from "@/lib/sports/config"

const SPORTS = [
  { value: "", label: "Todos" },
  ...VISIBLE_SPORT_OPTIONS,
]

interface ClubsViewProps {
  clubs: ClubWithSports[]
  provinces: string[]
}

export function ClubsView({ clubs, provinces }: ClubsViewProps) {
  const [search, setSearch] = useState("")
  const [activeSport, setActiveSport] = useState("")
  const [activeProvince, setActiveProvince] = useState("")

  const filtered = useMemo(() => {
    return clubs.filter((club) => {
      const matchesSearch =
        !search ||
        club.name.toLowerCase().includes(search.toLowerCase()) ||
        club.city?.toLowerCase().includes(search.toLowerCase())

      const matchesSport =
        !activeSport || club.sports.includes(activeSport)

      const matchesProvince =
        !activeProvince || club.province === activeProvince

      return matchesSearch && matchesSport && matchesProvince
    })
  }, [clubs, search, activeSport, activeProvince])

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o ciudad…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-[12px] border border-[#e5e5e5] rounded-full bg-white text-[#0a0a0a] placeholder:text-zinc-400 focus:outline-none focus:border-[#0a0a0a] transition-colors"
          />
        </div>

        {/* Sport tabs + province */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          {!SINGLE_SPORT_MODE && (
            <div className="flex flex-wrap gap-1.5">
              {SPORTS.map((sport) => (
                <button
                  key={sport.value}
                  onClick={() => setActiveSport(sport.value)}
                  className={
                    activeSport === sport.value
                      ? "bg-[#0a0a0a] text-white rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] transition-colors"
                      : "border border-[#e5e5e5] text-zinc-500 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] hover:border-[#0a0a0a] transition-colors"
                  }
                >
                  {sport.label}
                </button>
              ))}
            </div>
          )}

          {provinces.length > 0 && (
            <select
              value={activeProvince}
              onChange={(e) => setActiveProvince(e.target.value)}
              className="text-[11px] font-black uppercase tracking-[0.1em] border border-[#e5e5e5] rounded-full px-3 py-1.5 bg-white text-zinc-500 focus:outline-none focus:border-[#0a0a0a] transition-colors"
            >
              <option value="">Todas las provincias</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 border border-dashed border-zinc-300 rounded-2xl">
          <Building2 className="size-10 text-zinc-300" />
          <p className="text-sm font-bold text-zinc-400">No se encontraron clubes</p>
          <p className="text-xs text-zinc-300">Prueba ajustando los filtros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((club, i) => (
            <ClubCard key={club.id} club={club} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
