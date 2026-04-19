"use client"

import Link from "next/link"
import { Trophy } from "lucide-react"
import type { Tournament } from "@/features/tournaments/types"

interface TorneosPanelProps {
  tournaments: Tournament[]
}

const SPORT_LABEL: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

function formatDate(dateStr: string): { day: string; month: string } {
  const date = new Date(dateStr + "T12:00:00")
  return {
    day: date.toLocaleDateString("es-EC", { day: "numeric" }),
    month: date.toLocaleDateString("es-EC", { month: "short" }),
  }
}

function PanelHeader({ title, cta, ctaHref }: { title: string; cta: string; ctaHref: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
      <h2 className="text-sm font-black uppercase tracking-[-0.02em]" style={{ fontFamily: "var(--font-heading)" }}>
        {title}
      </h2>
      <Link href={ctaHref} className="text-[11px] font-black uppercase tracking-[0.1em] text-primary hover:underline">
        {cta} →
      </Link>
    </div>
  )
}

export function TorneosPanel({ tournaments }: TorneosPanelProps) {
  return (
    <div className="animate-fade-in-up rounded-2xl overflow-hidden bg-card border border-border">
      <PanelHeader title="Torneos abiertos" cta="Explorar" ctaHref="/dashboard/tournaments" />

      {tournaments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Trophy className="size-8 text-zinc-300" />
          <p className="text-sm font-bold text-zinc-400">No hay torneos abiertos ahora</p>
          <Link
            href="/dashboard/tournaments/create"
            className="text-[11px] font-bold text-foreground hover:underline"
          >
            Crea el primero →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col">
          {tournaments.map((t, i) => {
            const d = formatDate(t.start_date)
            const sportLabel = SPORT_LABEL[t.sport] ?? t.sport

            return (
              <Link
                key={t.id}
                href={`/dashboard/tournaments/${t.id}`}
                className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-muted/50 transition-colors"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
              >
                {/* Date tile */}
                <div className="w-11 h-11 rounded-[10px] bg-[#0a0a0a] text-white flex flex-col items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold tracking-[0.1em] uppercase opacity-70">{d.month}</span>
                  <span className="font-black text-base tracking-[-0.02em] leading-none" style={{ fontFamily: "var(--font-heading)" }}>{d.day}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{sportLabel}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {t.max_participants}
                  </p>
                  <p className="text-[10px] text-muted-foreground">cupos</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
