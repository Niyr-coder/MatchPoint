"use client"

import { useState } from "react"
import { Trophy } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { VISIBLE_SPORT_OPTIONS, SINGLE_SPORT_MODE } from "@/lib/sports/config"
import type { RankingEntry } from "@/features/ratings/types"

const SPORTS = [
  { value: "", label: "Todos" },
  ...VISIBLE_SPORT_OPTIONS,
]

const MEDALS = ["🥇", "🥈", "🥉"]

interface RankingBySport {
  sport: string
  entries: RankingEntry[]
}

interface RankingViewProps {
  all: RankingEntry[]
  bySport: RankingBySport[]
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
}

function Avatar({ entry }: { entry: RankingEntry }) {
  if (entry.avatarUrl) {
    return (
      <Image
        src={entry.avatarUrl}
        alt={entry.fullName}
        width={36}
        height={36}
        className="size-9 rounded-full object-cover border border-[#e5e5e5]"
      />
    )
  }
  return (
    <div className="size-9 rounded-full bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center">
      <span className="text-[11px] font-black text-[#1a56db]">
        {getInitials(entry.fullName)}
      </span>
    </div>
  )
}

function TopThreeCard({ entry }: { entry: RankingEntry }) {
  const isFirst = entry.position === 1
  return (
    <Link
      href={`/dashboard/players/${entry.userId}`}
      className={`animate-fade-in-up rounded-2xl p-5 flex flex-col items-center gap-3 border transition-shadow hover:shadow-md ${
        isFirst
          ? "bg-[#eff6ff] border-[#bfdbfe]"
          : "bg-white border-[#e5e5e5]"
      }`}
      style={{ animationDelay: `${(entry.position - 1) * 0.06}s` }}
    >
      <span className="text-2xl">{MEDALS[entry.position - 1]}</span>
      {entry.avatarUrl ? (
        <Image
          src={entry.avatarUrl}
          alt={entry.fullName}
          width={isFirst ? 64 : 48}
          height={isFirst ? 64 : 48}
          className={`rounded-full object-cover border-2 ${
            isFirst ? "size-16 border-[#1a56db]" : "size-12 border-[#e5e5e5]"
          }`}
        />
      ) : (
        <div
          className={`rounded-full flex items-center justify-center border-2 ${
            isFirst
              ? "size-16 bg-[#1a56db] border-[#1a56db]"
              : "size-12 bg-[#f4f4f5] border-[#e5e5e5]"
          }`}
        >
          <span
            className={`font-black ${
              isFirst ? "text-base text-white" : "text-sm text-zinc-500"
            }`}
          >
            {getInitials(entry.fullName)}
          </span>
        </div>
      )}
      <div className="text-center">
        <p className="text-sm font-black text-[#0a0a0a] leading-tight">
          {entry.fullName}
        </p>
        <p
          className={`text-[11px] font-black mt-0.5 ${
            isFirst ? "text-[#1a56db]" : "text-zinc-400"
          }`}
        >
          {entry.score} pts
        </p>
      </div>
      <div className="flex gap-3 text-[10px] font-black uppercase tracking-wide text-zinc-400">
        <span>{entry.wins}V</span>
        <span>·</span>
        <span>{entry.losses}D</span>
      </div>
    </Link>
  )
}

function RankingRow({ entry, index }: { entry: RankingEntry; index: number }) {
  return (
    <Link
      href={`/dashboard/players/${entry.userId}`}
      className="animate-fade-in-up-8 flex items-center gap-4 py-3 border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa] transition-colors -mx-5 px-5"
      style={{ animationDelay: `${index * 0.02}s` }}
    >
      <span className="text-[11px] font-black text-zinc-400 w-6 text-right shrink-0">
        {entry.position}
      </span>
      <Avatar entry={entry} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-[#0a0a0a] truncate">
          {entry.fullName}
        </p>
        <p className="text-[11px] text-zinc-400">
          {entry.wins}V · {entry.losses}D
        </p>
      </div>
      <span className="text-[11px] font-black text-[#1a56db] shrink-0">
        {entry.score} pts
      </span>
    </Link>
  )
}

function RankingList({ entries }: { entries: RankingEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 border border-dashed border-zinc-300 rounded-2xl">
        <Trophy className="size-10 text-zinc-300" />
        <p className="text-sm font-bold text-zinc-400">
          Aún no hay ranking
        </p>
        <p className="text-xs text-zinc-300">
          Participa en torneos para aparecer aquí
        </p>
      </div>
    )
  }

  const topThree = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div className="flex flex-col gap-6">
      {/* Top 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {topThree.map((entry) => (
          <TopThreeCard key={entry.userId} entry={entry} />
        ))}
      </div>

      {/* Rest */}
      {rest.length > 0 && (
        <div className="rounded-2xl bg-white border border-[#e5e5e5] px-5">
          {rest.map((entry, i) => (
            <RankingRow key={entry.userId} entry={entry} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

export function RankingView({ all, bySport }: RankingViewProps) {
  const [activeSport, setActiveSport] = useState("")

  const currentEntries =
    activeSport === ""
      ? all
      : (bySport.find((b) => b.sport === activeSport)?.entries ?? [])

  return (
    <div className="flex flex-col gap-6">
      {/* Sport tabs — hidden in single-sport mode */}
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

      <RankingList entries={currentEntries} />
    </div>
  )
}
