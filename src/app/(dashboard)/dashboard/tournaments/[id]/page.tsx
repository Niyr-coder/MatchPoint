import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getTournamentById, isUserInTournament } from "@/lib/tournaments/queries"
import { notFound } from "next/navigation"
import { Trophy, Users, Calendar, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { JoinTournamentButton } from "./JoinTournamentButton"

const SPORT_LABEL: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  open: { label: "Abierto", classes: "bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]" },
  in_progress: { label: "En curso", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  completed: { label: "Completado", classes: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  draft: { label: "Borrador", classes: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  cancelled: { label: "Cancelado", classes: "bg-red-50 text-red-600 border-red-200" },
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const ctx = await authorizeOrRedirect()
  const { id } = await params

  const [tournament, alreadyJoined] = await Promise.all([
    getTournamentById(id),
    isUserInTournament(id, ctx.userId),
  ])

  if (!tournament) notFound()

  const st = STATUS_STYLES[tournament.status] ?? STATUS_STYLES.open

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Back */}
      <Link
        href="/dashboard/tournaments"
        className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 hover:text-zinc-600"
      >
        <ArrowLeft className="size-3" />
        Volver a torneos
      </Link>

      {/* Hero */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#1a56db" }}>
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="size-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Trophy className="size-6 text-white" />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full border ${st.classes}`}>
              {st.label}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white uppercase leading-tight tracking-[-0.02em] mb-2">
            {tournament.name}
          </h1>
          {tournament.description && (
            <p className="text-sm text-white/70 leading-relaxed">{tournament.description}</p>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="rounded-2xl bg-white border border-[#e5e5e5] divide-y divide-[#f0f0f0]">
        <div className="grid grid-cols-2 divide-x divide-[#f0f0f0]">
          <div className="p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-1">Deporte</p>
            <p className="text-sm font-black text-[#0a0a0a]">
              {SPORT_LABEL[tournament.sport] ?? tournament.sport}
            </p>
          </div>
          <div className="p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-1">Inscripción</p>
            <p className="text-sm font-black text-[#0a0a0a]">
              {tournament.entry_fee > 0 ? `$${tournament.entry_fee}` : "Gratis"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-[#f0f0f0]">
          <div className="p-5 flex items-center gap-2">
            <Calendar className="size-4 text-zinc-400" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Inicio</p>
              <p className="text-sm font-bold text-[#0a0a0a]">
                {new Date(tournament.start_date + "T12:00:00").toLocaleDateString("es-EC", {
                  day: "numeric", month: "long", year: "numeric"
                })}
              </p>
            </div>
          </div>
          <div className="p-5 flex items-center gap-2">
            <Users className="size-4 text-zinc-400" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Cupos</p>
              <p className="text-sm font-bold text-[#0a0a0a]">{tournament.max_participants}</p>
            </div>
          </div>
        </div>

        {tournament.clubs && (
          <div className="p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-1">Club organizador</p>
            <p className="text-sm font-black text-[#0a0a0a]">{tournament.clubs.name}</p>
          </div>
        )}
      </div>

      {/* CTA */}
      {tournament.status === "open" && (
        <JoinTournamentButton tournamentId={id} alreadyJoined={alreadyJoined} />
      )}
    </div>
  )
}
