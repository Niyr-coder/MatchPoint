"use client"

import type { QuedadaParticipant } from "@/features/organizer/types"

interface Props {
  quedadaId: string
  dynamic: string
  participants: QuedadaParticipant[]
}

function getDisplayName(p: QuedadaParticipant): string {
  if (p.guest_name) return `${p.guest_name} ${p.guest_lastname ?? ""}`.trim()
  return p.profiles?.full_name ?? p.profiles?.username ?? "?"
}

export function RotationScoreboard({ participants, dynamic }: Props) {
  const descriptions: Record<string, string> = {
    king_of_court: "El ganador permanece en cancha. El perdedor pasa al final de la fila.",
    popcorn: "Rotacion aleatoria — el ganador elige quien entra.",
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-muted rounded-2xl p-4">
        <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-1">
          {dynamic === "king_of_court" ? "King of the Court" : "Popcorn"}
        </p>
        <p className="text-xs text-zinc-500">{descriptions[dynamic] ?? ""}</p>
      </div>

      {participants.length < 2 ? (
        <div className="text-center py-8 text-zinc-400 text-sm border border-dashed border-border rounded-2xl">
          Necesitas al menos 2 jugadores para iniciar el scoreboard.
        </div>
      ) : (
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-3">
            Jugadores ({participants.length})
          </p>
          <div className="flex flex-col gap-2">
            {participants.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  i === 0 ? "border-green-200 bg-green-50" : "border-border"
                }`}
              >
                <div
                  className={`size-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    i === 0 ? "bg-green-600 text-white" : "bg-muted text-zinc-600"
                  }`}
                >
                  {i === 0 ? "1" : i + 1}
                </div>
                <span className="text-sm font-bold">{getDisplayName(p)}</span>
                {i === 0 && (
                  <span className="ml-auto text-[10px] font-black text-green-600 uppercase">
                    En cancha
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-zinc-400 mt-3 text-center">
            Registra los resultados manualmente por ahora — scoring digital llegara pronto.
          </p>
        </div>
      )}
    </div>
  )
}
