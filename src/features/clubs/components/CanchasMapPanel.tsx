"use client"

import Link from "next/link"
import { MapPin, Navigation } from "lucide-react"
import type { Court } from "@/features/clubs/types"

interface CanchasMapPanelProps {
  courts: Court[]
}

const SPORT_LABEL: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

export function CanchasMapPanel({ courts }: CanchasMapPanelProps) {
  return (
    <div
      className="animate-fade-in-up rounded-2xl overflow-hidden flex flex-col bg-white"
      style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-50">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-[#16a34a]/10 flex items-center justify-center">
            <MapPin className="size-4 text-[#16a34a]" />
          </div>
          <h2 className="text-sm font-black uppercase tracking-tight text-[#0a0a0a]">
            Canchas Disponibles
          </h2>
        </div>
        <span className="text-[11px] font-black text-[#16a34a] bg-[#16a34a]/10 px-2.5 py-0.5 rounded-full">
          {courts.length} activas
        </span>
      </div>

      {/* Map placeholder */}
      <div
        className="mx-4 mt-4 rounded-xl flex flex-col items-center justify-center gap-2 py-8"
        style={{
          background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
          border: "2px dashed #86efac",
        }}
      >
        <Navigation className="size-7 text-[#16a34a]/50" />
        <p className="text-xs font-bold text-[#16a34a]/60 text-center">
          Mapa interactivo próximamente
        </p>
        <p className="text-[10px] text-[#16a34a]/40 text-center">
          GPS · Vista satelital · Filtros por deporte
        </p>
      </div>

      {/* Court list */}
      <div className="flex-1 divide-y divide-zinc-50 mt-2">
        {courts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-1">
            <p className="text-xs font-bold text-[#16a34a]/50">Sin canchas disponibles</p>
          </div>
        ) : (
          courts.slice(0, 3).map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-6 py-3">
              <div className="size-8 rounded-lg bg-[#16a34a]/10 flex items-center justify-center shrink-0">
                <MapPin className="size-3.5 text-[#16a34a]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#0a0a0a] truncate">
                  {c.clubs?.name ?? "Club"} — {c.name}
                </p>
                <p className="text-[11px] text-[#16a34a]/70">
                  {SPORT_LABEL[c.sport] ?? c.sport}
                  {c.surface_type ? ` · ${c.surface_type}` : ""}
                  {c.is_indoor ? " · Cubierta" : ""}
                </p>
              </div>
              <span className="text-[11px] font-black text-[#16a34a] whitespace-nowrap">
                ${c.price_per_hour}/h
              </span>
            </div>
          ))
        )}
      </div>

      <div className="px-6 py-3">
        <Link href="/dashboard/courts" className="text-[11px] font-bold text-[#16a34a] hover:underline">
          Ver todas las canchas →
        </Link>
      </div>
    </div>
  )
}
