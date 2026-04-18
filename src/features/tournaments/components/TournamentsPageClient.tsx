'use client'

import { useOpenTournaments, useMyTournaments } from '../hooks'
import Link from 'next/link'
import { Trophy, Users } from 'lucide-react'

const SPORT_LABEL: Record<string, string> = {
  futbol: 'Fútbol',
  padel: 'Pádel',
  tenis: 'Tenis',
  pickleball: 'Pickleball',
}

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  draft:       { label: 'Borrador',   classes: 'bg-muted text-zinc-400 border-zinc-200' },
  open:        { label: 'Abierto',    classes: 'bg-success text-primary border-success-border' },
  in_progress: { label: 'En curso',   classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed:   { label: 'Completado', classes: 'bg-muted text-zinc-500 border-zinc-200' },
  cancelled:   { label: 'Cancelado',  classes: 'bg-red-50 text-red-600 border-red-200' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface Props {
  userId: string
}

export function TournamentsPageClient({ userId }: Props) {
  const { data: openTournaments = [] } = useOpenTournaments()
  const { data: myTournaments = [] } = useMyTournaments(userId || undefined)

  return (
    <div className="flex flex-col gap-8">
      {myTournaments.length > 0 && (
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">
            Mis Torneos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myTournaments.map((t) => {
              const st = STATUS_STYLES[t.status] ?? STATUS_STYLES.open
              return (
                <Link
                  key={t.id}
                  href={`/dashboard/tournaments/${t.id}`}
                  className="rounded-2xl bg-card border border-foreground/30 p-5 flex flex-col gap-3 hover:border-foreground transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${st.classes}`}>
                      {st.label}
                    </span>
                    <span className="text-[11px] font-bold text-zinc-400">{formatDate(t.start_date)}</span>
                  </div>
                  <h3 className="text-sm font-black text-foreground leading-tight">{t.name}</h3>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                    <span>{SPORT_LABEL[t.sport] ?? t.sport}</span>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <Users className="size-3" />
                      <span>{t.max_participants ? `${t.max_participants} cupos` : 'Sin límite'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end pt-2 border-t border-border">
                    <span className="text-[11px] font-black text-foreground uppercase tracking-wide">Ver Detalles →</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">
          Torneos Abiertos
        </h2>
        {openTournaments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 border border-dashed border-border rounded-2xl">
            <Trophy className="size-10 text-zinc-300" />
            <p className="text-sm font-bold text-zinc-400">No hay torneos abiertos</p>
            <Link href="/dashboard/tournaments/create" className="text-[11px] font-black text-foreground hover:underline">
              Crea el primero →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {openTournaments.map((t) => {
              const st = STATUS_STYLES[t.status] ?? STATUS_STYLES.open
              return (
                <Link
                  key={t.id}
                  href={`/dashboard/tournaments/${t.id}`}
                  className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-3 hover:border-foreground/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${st.classes}`}>
                      {st.label}
                    </span>
                    <span className="text-[11px] font-bold text-zinc-400">{formatDate(t.start_date)}</span>
                  </div>
                  <h3 className="text-sm font-black text-foreground leading-tight">{t.name}</h3>
                  {t.description && (
                    <p className="text-[11px] text-zinc-500 line-clamp-2">{t.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                    <span>{SPORT_LABEL[t.sport] ?? t.sport}</span>
                    {t.clubs && <><span>·</span><span>{t.clubs.name}</span></>}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                    <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                      <Users className="size-3" />
                      <span>{t.max_participants ? `${t.max_participants} cupos` : 'Sin límite'}</span>
                    </div>
                    <span className="text-[11px] font-black text-foreground">
                      {t.entry_fee > 0 ? `$${t.entry_fee}` : 'Gratis'}
                    </span>
                  </div>
                  <div className="flex items-center justify-end pt-2 border-t border-border">
                    <span className="text-[11px] font-black text-foreground uppercase tracking-wide">Ver Detalles →</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
