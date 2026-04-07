import { authorizeOrRedirect } from "@/features/auth/queries"
import { getOpenTournaments, getCreatedTournaments } from "@/features/tournaments/queries"
import { Trophy, Users, Plus } from "lucide-react"
import Link from "next/link"

const SPORT_LABEL: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  draft:       { label: "Borrador",   classes: "bg-zinc-100 text-zinc-400 border-zinc-200" },
  open:        { label: "Abierto",    classes: "bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]" },
  in_progress: { label: "En curso",   classes: "bg-amber-50 text-amber-700 border-amber-200" },
  completed:   { label: "Completado", classes: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  cancelled:   { label: "Cancelado",  classes: "bg-red-50 text-red-600 border-red-200" },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default async function TournamentsPage() {
  const ctx = await authorizeOrRedirect()

  const [openTournaments, myTournaments] = await Promise.all([
    getOpenTournaments(),
    getCreatedTournaments(ctx.userId),
  ])

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">
            Competencias
          </p>
          <h1 className="text-3xl font-black uppercase tracking-[-0.03em] text-[#0a0a0a]">
            Torneos
          </h1>
        </div>
        <Link
          href="/dashboard/tournaments/create"
          className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] px-4 py-2 bg-[#0a0a0a] text-white rounded-full hover:bg-[#222] transition-colors"
        >
          <Plus className="size-3.5" />
          Crear Torneo
        </Link>
      </div>

      {/* My tournaments */}
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
                  className="rounded-2xl bg-white border border-[#1a56db]/30 p-5 flex flex-col gap-3 hover:border-[#1a56db] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${st.classes}`}>
                      {st.label}
                    </span>
                    <span className="text-[11px] font-bold text-zinc-400">{formatDate(t.start_date)}</span>
                  </div>
                  <h3 className="text-sm font-black text-[#0a0a0a] leading-tight">{t.name}</h3>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                    <span>{SPORT_LABEL[t.sport] ?? t.sport}</span>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <Users className="size-3" />
                      <span>{t.max_participants ? `${t.max_participants} cupos` : "Sin límite"}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Open tournaments */}
      <section>
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">
          Torneos Abiertos
        </h2>

        {openTournaments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 border border-dashed border-[#e5e5e5] rounded-2xl">
            <Trophy className="size-10 text-zinc-300" />
            <p className="text-sm font-bold text-zinc-400">No hay torneos abiertos</p>
            <Link
              href="/dashboard/tournaments/create"
              className="text-[11px] font-black text-[#1a56db] hover:underline"
            >
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
                  className="rounded-2xl bg-white border border-[#e5e5e5] p-5 flex flex-col gap-3 hover:border-[#1a56db]/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${st.classes}`}>
                      {st.label}
                    </span>
                    <span className="text-[11px] font-bold text-zinc-400">{formatDate(t.start_date)}</span>
                  </div>
                  <h3 className="text-sm font-black text-[#0a0a0a] leading-tight">{t.name}</h3>
                  {t.description && (
                    <p className="text-[11px] text-zinc-500 line-clamp-2">{t.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                    <span>{SPORT_LABEL[t.sport] ?? t.sport}</span>
                    {t.clubs && (
                      <>
                        <span>·</span>
                        <span>{t.clubs.name}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f0]">
                    <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                      <Users className="size-3" />
                      <span>{t.max_participants} cupos</span>
                    </div>
                    <span className="text-[11px] font-black text-[#1a56db]">
                      {t.entry_fee > 0 ? `$${t.entry_fee}` : "Gratis"}
                    </span>
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
