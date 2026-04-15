"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Swords } from "lucide-react"
import type { Quedada } from "@/features/organizer/types"

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  draft:       { label: "Borrador",   classes: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  open:        { label: "Abierta",    classes: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "En curso",   classes: "bg-green-50 text-green-700 border-green-200" },
  completed:   { label: "Completada", classes: "bg-zinc-50 text-zinc-500 border-zinc-200" },
  cancelled:   { label: "Cancelada",  classes: "bg-red-50 text-red-600 border-red-200" },
}

const DYNAMIC_LABELS: Record<string, string> = {
  standard: "Estándar",
  king_of_court: "👑 King of the Court",
  popcorn: "🍿 Popcorn",
  round_robin: "Round Robin",
}

const TABS = ["Mis Quedadas", "Historial"] as const
type Tab = (typeof TABS)[number]

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function OrganizerShell({ quedadas }: { quedadas: Quedada[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("Mis Quedadas")

  const active = quedadas.filter(q => !["completed", "cancelled"].includes(q.status))
  const history = quedadas.filter(q => ["completed", "cancelled"].includes(q.status))
  const displayed = activeTab === "Mis Quedadas" ? active : history

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">
            Organización
          </p>
          <h1 className="text-2xl font-black text-foreground">Mis Quedadas</h1>
        </div>
        <Link
          href="/dashboard/organizer/new"
          className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] px-4 py-2 bg-foreground text-white rounded-full hover:bg-foreground/90 transition-colors"
        >
          <Plus className="size-3.5" />
          Nueva quedada
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-0">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-wide transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-foreground text-foreground"
                : "border-transparent text-zinc-400 hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 border border-dashed border-border rounded-2xl">
          <Swords className="size-10 text-zinc-300" />
          <p className="text-sm font-bold text-zinc-400">
            {activeTab === "Mis Quedadas" ? "No hay quedadas activas" : "Sin historial aún"}
          </p>
          {activeTab === "Mis Quedadas" && (
            <Link
              href="/dashboard/organizer/new"
              className="text-[11px] font-black text-foreground hover:underline"
            >
              Crea la primera →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map(q => {
            const st = STATUS_STYLES[q.status] ?? STATUS_STYLES.open
            return (
              <Link
                key={q.id}
                href={`/dashboard/organizer/${q.id}`}
                className="rounded-2xl bg-card border border-foreground/30 p-5 flex flex-col gap-3 hover:border-foreground transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${st.classes}`}>
                    {st.label}
                  </span>
                  <span className="text-[11px] font-bold text-zinc-400">{formatDate(q.start_date)}</span>
                </div>
                <h3 className="text-sm font-black text-foreground leading-tight">{q.name}</h3>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <span>🏓 Pickleball</span>
                  {q.game_dynamic && (
                    <>
                      <span>·</span>
                      <span>{DYNAMIC_LABELS[q.game_dynamic] ?? q.game_dynamic}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center justify-end pt-2 border-t border-border">
                  <span className="text-[11px] font-black text-foreground uppercase tracking-wide">Gestionar →</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
