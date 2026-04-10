"use client"

import { Trophy, Users, Plus } from "lucide-react"
import Link from "next/link"
import type { Tournament } from "@/features/tournaments/types"

interface TorneosPanelProps {
  tournaments: Tournament[]
}

type DisplayEstado = "abierto" | "en_curso" | "completado"

const ESTADO_STYLES: Record<DisplayEstado, { label: string; classes: string }> = {
  abierto: { label: "Abierto", classes: "bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]" },
  en_curso: { label: "En curso", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  completado: { label: "Completado", classes: "bg-muted text-zinc-500 border-zinc-200" },
}

const STATUS_MAP: Record<string, DisplayEstado> = {
  open: "abierto",
  in_progress: "en_curso",
  completed: "completado",
}

const SPORT_LABEL: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  return date.toLocaleDateString("es-EC", { day: "numeric", month: "short" })
}

export function TorneosPanel({ tournaments }: TorneosPanelProps) {
  return (
    <div
      className="animate-fade-in-up relative rounded-2xl overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" }}
    >
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/20">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-card/20 flex items-center justify-center">
              <Trophy className="size-4 text-white" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-tight text-white">
              Torneos
            </h2>
          </div>
          <Link
            href="/dashboard/tournaments/create"
            className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #fb923c, #f97316)", color: "white" }}
          >
            <Plus className="size-3" />
            Crear Torneo
          </Link>
        </div>

        {/* Tournament cards */}
        {tournaments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Trophy className="size-8 text-white/30" />
            <p className="text-sm font-bold text-white/50">No hay torneos abiertos ahora</p>
            <Link
              href="/dashboard/tournaments/create"
              className="text-[11px] font-black text-white/70 hover:text-white underline"
            >
              Crea el primero →
            </Link>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto px-6 py-5 scrollbar-hide">
            {tournaments.map((t) => {
              const displayStatus = STATUS_MAP[t.status] ?? "abierto"
              const est = ESTADO_STYLES[displayStatus]

              return (
                <Link
                  key={t.id}
                  href={`/dashboard/tournaments/${t.id}`}
                  className="shrink-0 w-52 rounded-xl bg-card/15 border border-white/20 p-4 hover:bg-card/25 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${est.classes}`}>
                      {est.label}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white leading-tight mb-1">{t.name}</h3>
                  <p className="text-[11px] text-white/70 mb-3">{SPORT_LABEL[t.sport] ?? t.sport}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Users className="size-3 text-white/60" />
                      <span className="text-[11px] font-bold text-white/70">
                        {t.max_participants} cupos
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-white/70">
                      {formatDate(t.start_date)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-4">
          <Link href="/dashboard/tournaments" className="text-[11px] font-bold text-white/80 hover:text-white hover:underline transition-colors">
            Ver todos los torneos →
          </Link>
        </div>
      </div>
    </div>
  )
}
