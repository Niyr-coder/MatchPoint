"use client"

import { BracketView } from "@/features/tournaments/components/BracketView"
import type { Quedada } from "@/features/organizer/types"

interface Props {
  quedada: Quedada
  participantCount: number
}

export function BracketPanel({ quedada, participantCount }: Props) {
  if (participantCount < 4) {
    return (
      <div className="text-center py-8 border border-dashed border-border rounded-2xl">
        <p className="text-sm font-bold text-zinc-400">
          Necesitas al menos 4 jugadores para generar un bracket.
        </p>
        <p className="text-xs text-zinc-400 mt-1">
          Tienes {participantCount} inscrito{participantCount !== 1 ? "s" : ""}.
        </p>
      </div>
    )
  }

  return (
    <BracketView
      tournamentId={quedada.id}
      isCreator={true}
      modality={quedada.modality}
      tournamentStatus="in_progress"
      bracketLocked={false}
    />
  )
}
