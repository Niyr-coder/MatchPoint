"use client"

import { useState } from "react"
import { Trophy, ChevronDown, Info } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { VISIBLE_SPORT_OPTIONS, SINGLE_SPORT_MODE } from "@/lib/sports/config"
import { BADGE_CONFIG } from "@/features/badges/constants"
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
        className="size-9 rounded-full object-cover border border-border"
      />
    )
  }
  return (
    <div className="size-9 rounded-full bg-muted border border-border flex items-center justify-center">
      <span className="text-[11px] font-black text-foreground">
        {getInitials(entry.fullName)}
      </span>
    </div>
  )
}

function TopThreeCard({ entry }: { entry: RankingEntry }) {
  const isFirst = entry.position === 1
  return (
    <Link
      href={`/dashboard/players/${entry.username ?? entry.userId}`}
      className={`animate-fade-in-up rounded-2xl p-5 flex flex-col items-center gap-3 border transition-shadow ${
        isFirst
          ? "bg-muted border-border"
          : "bg-card border-border"
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
            isFirst ? "size-16 border-foreground" : "size-12 border-border"
          }`}
        />
      ) : (
        <div
          className={`rounded-full flex items-center justify-center border-2 ${
            isFirst
              ? "size-16 bg-foreground border-foreground"
              : "size-12 bg-[#f4f4f5] border-border"
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
        <p className="text-sm font-black text-foreground leading-tight">
          {entry.fullName}
        </p>
        <p
          className={`text-[11px] font-black mt-0.5 ${
            isFirst ? "text-foreground" : "text-zinc-400"
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
      href={`/dashboard/players/${entry.username ?? entry.userId}`}
      className="animate-fade-in-up-8 flex items-center gap-4 py-3 border-b border-border last:border-0 hover:bg-muted transition-colors -mx-5 px-5"
      style={{ animationDelay: `${index * 0.02}s` }}
    >
      <span className="text-[11px] font-black text-zinc-400 w-6 text-right shrink-0">
        {entry.position}
      </span>
      <Avatar entry={entry} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-foreground truncate">
          {entry.fullName}
          {entry.badges?.length > 0 && entry.badges.map((type) => {
            const cfg = BADGE_CONFIG[type]
            return <span key={type} title={cfg.label} className="text-xs">{cfg.emoji}</span>
          })}
        </p>
        <p className="text-[11px] text-zinc-400">
          {entry.wins}V · {entry.losses}D
        </p>
      </div>
      <span className="text-[11px] font-black text-foreground shrink-0">
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
        <div className="rounded-2xl bg-card border border-border px-5">
          {rest.map((entry, i) => (
            <RankingRow key={entry.userId} entry={entry} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function RankingInfoPanel() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Info className="size-4 text-primary shrink-0" />
          <span className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground">
            ¿Cómo funciona el ranking?
          </span>
        </div>
        <ChevronDown
          className={`size-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-border">
          <ul className="mt-4 space-y-3">
            {[
              {
                title: "Inscríbete en un torneo",
                desc: "Desde el momento en que te registras ya apareces en el ranking con 0 puntos.",
              },
              {
                title: "Gana puntos jugando",
                desc: "Cada victoria en partido oficial suma puntos. El sistema pondera la dificultad del rival.",
              },
              {
                title: "Ranking en tiempo real",
                desc: "La clasificación se actualiza automáticamente en cuanto se registra el resultado de un partido.",
              },
              {
                title: "Posición global",
                desc: "Se calcula sumando todos tus puntos acumulados en torneos MATCHPOINT.",
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 size-1.5 rounded-full bg-primary shrink-0 mt-[7px]" />
                <div>
                  <p className="text-[11px] font-black text-foreground uppercase tracking-wide">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
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
                  ? "bg-foreground text-white rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] transition-colors"
                  : "border border-border text-zinc-500 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] hover:border-foreground transition-colors"
              }
            >
              {sport.label}
            </button>
          ))}
        </div>
      )}

      <RankingInfoPanel />

      <RankingList entries={currentEntries} />
    </div>
  )
}
