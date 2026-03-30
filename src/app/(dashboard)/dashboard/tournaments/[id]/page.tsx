import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getTournamentById, isUserInTournament } from "@/lib/tournaments/queries"
import { notFound } from "next/navigation"
import { Trophy, Calendar, Clock, DollarSign, MapPin, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { TournamentClientShell } from "./TournamentClientShell"

const SPORT_LABEL: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

const STATUS_DOT: Record<string, { label: string; dot: string; badge: string }> = {
  open:        { label: "Abierto",    dot: "bg-green-500",  badge: "bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]" },
  in_progress: { label: "En curso",   dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200" },
  completed:   { label: "Completado", dot: "bg-zinc-400",   badge: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  draft:       { label: "Borrador",   dot: "bg-zinc-400",   badge: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  cancelled:   { label: "Cancelado",  dot: "bg-red-500",    badge: "bg-red-50 text-red-600 border-red-200" },
}

const EXTRAS_META: Record<string, { emoji: string; label: string }> = {
  sorteos:      { emoji: "🎰", label: "Sorteos" },
  premios:      { emoji: "🏆", label: "Premios" },
  streaming:    { emoji: "📺", label: "Streaming" },
  fotografia:   { emoji: "📸", label: "Fotografía" },
  arbitro:      { emoji: "🦺", label: "Árbitro oficial" },
  patrocinador: { emoji: "🤝", label: "Patrocinador" },
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

  const t = tournament as typeof tournament & {
    modality?: string | null
    start_time?: string | null
    is_official?: boolean
    extras?: Record<string, { enabled?: boolean; detail?: string; name?: string }>
  }

  const st = STATUS_DOT[t.status] ?? STATUS_DOT.open
  const isCreator = t.created_by === ctx.userId
  const canJoin = t.status === "open" && !isCreator && !alreadyJoined

  const enabledExtras = t.extras
    ? Object.entries(t.extras).filter(([, v]) => v?.enabled)
    : []

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* Back */}
      <Link
        href="/dashboard/tournaments"
        className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 hover:text-zinc-600"
      >
        <ArrowLeft className="size-3" />
        Volver a torneos
      </Link>

      {/* Hero — default card style, no color */}
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="size-12 rounded-xl bg-zinc-100 flex items-center justify-center">
            <Trophy className="size-6 text-zinc-400" />
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {t.is_official && (
              <span className="text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                OFICIAL
              </span>
            )}
            <span className={`text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full border flex items-center gap-1.5 ${st.badge}`}>
              <span className={`size-1.5 rounded-full inline-block ${st.dot}`} />
              {st.label}
            </span>
          </div>
        </div>
        <h1 className="text-2xl font-black text-[#0a0a0a] uppercase leading-tight tracking-[-0.02em] mb-3">
          {t.name}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600">
            {SPORT_LABEL[t.sport] ?? t.sport}
          </span>
          {t.modality && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600">
              {t.modality}
            </span>
          )}
        </div>
        {t.description && (
          <p className="text-sm text-zinc-500 leading-relaxed mt-3">{t.description}</p>
        )}
      </div>

      {/* Info grid */}
      <div className="rounded-2xl bg-white border border-[#e5e5e5] divide-y divide-[#f0f0f0]">
        <div className="grid grid-cols-2 divide-x divide-[#f0f0f0]">
          <div className="p-5 flex items-center gap-2">
            <Calendar className="size-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Fecha</p>
              <p className="text-sm font-bold text-[#0a0a0a]">
                {new Date(t.start_date + "T12:00:00").toLocaleDateString("es-EC", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="p-5 flex items-center gap-2">
            <Clock className="size-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Hora</p>
              <p className="text-sm font-bold text-[#0a0a0a]">{t.start_time ?? "Por confirmar"}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-[#f0f0f0]">
          <div className="p-5 flex items-center gap-2">
            <DollarSign className="size-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Inscripción</p>
              <p className="text-sm font-bold text-[#0a0a0a]">
                {t.entry_fee > 0 ? `$${t.entry_fee}` : "Gratis"}
              </p>
            </div>
          </div>
          <div className="p-5 flex items-center gap-2">
            <MapPin className="size-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Club sede</p>
              <p className="text-sm font-bold text-[#0a0a0a]">
                {t.clubs?.name ?? "Por confirmar"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Extras */}
      {enabledExtras.length > 0 && (
        <div className="rounded-2xl bg-white border border-[#e5e5e5] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-3">Incluye</p>
          <div className="flex flex-wrap gap-2">
            {enabledExtras.map(([key, val]) => {
              const meta = EXTRAS_META[key]
              const label = val.name ?? meta?.label ?? key
              const emoji = meta?.emoji ?? "✅"
              return (
                <span key={key} className="text-xs font-bold px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-700 flex items-center gap-1.5">
                  <span>{emoji}</span>
                  {label}
                  {val.detail && <span className="text-zinc-400 font-normal">· {val.detail}</span>}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* All interactive/mutable parts — synced via shared refreshKey */}
      <TournamentClientShell
        tournamentId={id}
        currentStatus={t.status}
        isCreator={isCreator}
        canJoin={canJoin}
        alreadyJoined={alreadyJoined}
        entryFee={t.entry_fee}
        modality={t.modality}
        bracketLocked={t.bracket_locked ?? false}
      />
    </div>
  )
}
