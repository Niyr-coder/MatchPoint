import { authorizeOrRedirect } from "@/features/auth/queries"
import { getTournamentById, isUserInTournament, getTournamentParticipantsPreview } from "@/features/tournaments/queries"
import { notFound } from "next/navigation"
import { Trophy, Calendar, Clock, DollarSign, MapPin, ArrowLeft, Users } from "lucide-react"
import Link from "next/link"
import { TournamentClientShell } from "./TournamentClientShell"
import { TournamentPrizesSection } from "@/features/tournaments/components/TournamentPrizesSection"
import { TournamentSponsorsSection } from "@/features/tournaments/components/TournamentSponsorsSection"
import { TournamentParticipantsPreview } from "@/features/tournaments/components/TournamentParticipantsPreview"
import type { TournamentExtras } from "@/features/tournaments/types"

const SPORT_LABEL: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

const STATUS_DOT: Record<string, { label: string; dot: string; badge: string }> = {
  open:        { label: "Inscripciones abiertas", dot: "bg-green-500",  badge: "bg-success text-primary border-success-border" },
  in_progress: { label: "En curso",              dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200" },
  completed:   { label: "Finalizado",             dot: "bg-zinc-400",   badge: "bg-muted text-zinc-500 border-zinc-200" },
  draft:       { label: "Borrador",               dot: "bg-zinc-400",   badge: "bg-muted text-zinc-500 border-zinc-200" },
  cancelled:   { label: "Cancelado",              dot: "bg-red-500",    badge: "bg-red-50 text-red-600 border-red-200" },
}

const EXTRAS_PILLS: Record<string, { emoji: string; label: string }> = {
  sorteos:   { emoji: "🎰", label: "Sorteos" },
  streaming: { emoji: "📺", label: "Streaming" },
  fotografia:{ emoji: "📸", label: "Fotografía" },
  arbitro:   { emoji: "🦺", label: "Árbitro oficial" },
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const ctx = await authorizeOrRedirect()
  const { id } = await params

  const [tournament, alreadyJoined, { participants, total }] = await Promise.all([
    getTournamentById(id),
    isUserInTournament(id, ctx.userId),
    getTournamentParticipantsPreview(id, 10),
  ])

  if (!tournament) notFound()

  const t = tournament as typeof tournament & {
    modality?: string | null
    start_time?: string | null
    is_official?: boolean
    extras?: TournamentExtras
  }

  const st = STATUS_DOT[t.status] ?? STATUS_DOT.open
  const isCreator = t.created_by === ctx.userId
  const canJoin = t.status === "open" && !isCreator && !alreadyJoined
  const extras = t.extras ?? {}

  // Pills: only sorteos, streaming, fotografia, arbitro (premios & patrocinador get their own sections)
  const pillExtras = Object.entries(extras).filter(
    ([key, v]) => v?.enabled && key in EXTRAS_PILLS
  )

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      {/* Back */}
      <Link
        href="/dashboard/tournaments"
        className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 hover:text-zinc-600 w-fit"
      >
        <ArrowLeft className="size-3" />
        Torneos
      </Link>

      {/* Hero */}
      <div className="rounded-2xl bg-card border border-border p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="size-12 rounded-xl bg-foreground/5 border border-border flex items-center justify-center">
            <Trophy className="size-6 text-foreground" />
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {t.is_official && (
              <span className="text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                OFICIAL MATCHPOINT
              </span>
            )}
            <span className={`text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full border flex items-center gap-1.5 ${st.badge}`}>
              <span className={`size-1.5 rounded-full inline-block ${st.dot}`} />
              {st.label}
            </span>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-foreground uppercase leading-tight tracking-[-0.02em] mb-3">
          {t.name}
        </h1>

        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-muted text-zinc-600">
            {SPORT_LABEL[t.sport] ?? t.sport}
          </span>
          {t.modality && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-muted text-zinc-600">
              {t.modality}
            </span>
          )}
          {pillExtras.map(([key]) => {
            const meta = EXTRAS_PILLS[key]
            return (
              <span key={key} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-muted text-zinc-600 flex items-center gap-1">
                <span>{meta.emoji}</span>
                {meta.label}
              </span>
            )
          })}
        </div>

        {t.description && (
          <p className="text-sm text-zinc-600 leading-relaxed border-t border-border pt-4">
            {t.description}
          </p>
        )}
      </div>

      {/* Info grid */}
      <div className="rounded-2xl bg-card border border-border divide-y divide-border-subtle">
        <div className="grid grid-cols-2 divide-x divide-border-subtle">
          <div className="p-5 flex items-center gap-3">
            <Calendar className="size-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Fecha</p>
              <p className="text-sm font-bold text-foreground">
                {new Date(t.start_date + "T12:00:00").toLocaleDateString("es-EC", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="p-5 flex items-center gap-3">
            <Clock className="size-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Hora</p>
              <p className="text-sm font-bold text-foreground">{t.start_time ?? "Por confirmar"}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-border-subtle">
          <div className="p-5 flex items-center gap-3">
            <DollarSign className="size-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Inscripción</p>
              <p className="text-sm font-bold text-foreground">
                {t.entry_fee > 0 ? `$${t.entry_fee}` : "Gratis"}
              </p>
            </div>
          </div>
          <div className="p-5 flex items-center gap-3">
            <MapPin className="size-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Club sede</p>
              <p className="text-sm font-bold text-foreground">
                {t.clubs?.name ?? "Por confirmar"}
              </p>
            </div>
          </div>
        </div>
        <div className="p-5 flex items-center gap-3">
          <Users className="size-4 text-zinc-400 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Cupos</p>
              <p className="text-xs font-black text-foreground">{total} / {t.max_participants}</p>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground rounded-full"
                style={{ width: `${Math.min(100, Math.round((total / t.max_participants) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Participants preview */}
      {total > 0 && (
        <TournamentParticipantsPreview
          participants={participants}
          totalCount={total}
          maxParticipants={t.max_participants}
        />
      )}

      {/* Prizes section */}
      <TournamentPrizesSection extras={extras} />

      {/* Sponsors section */}
      <TournamentSponsorsSection extras={extras} />

      {/* Interactive shell */}
      <TournamentClientShell
        tournamentId={id}
        currentStatus={t.status}
        isCreator={isCreator}
        canJoin={canJoin}
        alreadyJoined={alreadyJoined}
        entryFee={t.entry_fee}
        modality={t.modality}
        bracketLocked={t.bracket_locked ?? false}
        isParticipant={alreadyJoined}
      />
    </div>
  )
}
