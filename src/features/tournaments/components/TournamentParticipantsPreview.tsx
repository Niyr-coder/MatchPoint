import { Users } from "lucide-react"

interface ParticipantPreview {
  user_id: string
  full_name?: string | null
  avatar_url?: string | null
}

interface Props {
  participants: ParticipantPreview[]
  totalCount: number
  maxParticipants: number
  onViewAll?: () => void
}

const MAX_AVATARS = 7

export function TournamentParticipantsPreview({
  participants,
  totalCount,
  maxParticipants,
  onViewAll,
}: Props) {
  const fillPercent = maxParticipants > 0 ? Math.min(100, Math.round((totalCount / maxParticipants) * 100)) : 0
  const visible = participants.slice(0, MAX_AVATARS)
  const overflow = Math.max(0, totalCount - MAX_AVATARS)

  return (
    <div className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-blue-500" />
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Participantes</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-foreground">{totalCount}</span>
          <span className="text-[11px] text-zinc-400">/ {maxParticipants} cupos</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-foreground rounded-full transition-all"
          style={{ width: `${fillPercent}%` }}
        />
      </div>

      {/* Avatars */}
      {totalCount > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {visible.map((p) => (
              <div
                key={p.user_id}
                className="size-8 rounded-full border-2 border-card bg-muted overflow-hidden shrink-0"
                title={p.full_name ?? "Jugador"}
              >
                {p.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatar_url} alt={p.full_name ?? ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center text-[10px] font-black text-zinc-500">
                    {(p.full_name ?? "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            {overflow > 0 && (
              <div className="size-8 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-black text-zinc-500 shrink-0">
                +{overflow}
              </div>
            )}
          </div>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-[11px] font-black text-zinc-400 hover:text-foreground transition-colors uppercase tracking-wide"
            >
              Ver todos →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
