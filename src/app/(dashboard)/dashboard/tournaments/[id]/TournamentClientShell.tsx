"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { TournamentManagePanel } from "./TournamentManagePanel"
import { JoinTournamentButton } from "./JoinTournamentButton"
import { ParticipantsManager } from "@/components/dashboard/ParticipantsManager"
import { BracketView } from "@/components/dashboard/BracketView"
import { CheckCircle } from "lucide-react"

interface Props {
  tournamentId: string
  currentStatus: string
  isCreator: boolean
  canJoin: boolean
  alreadyJoined: boolean
  entryFee: number
  modality?: string | null
}

export function TournamentClientShell({
  tournamentId,
  currentStatus,
  isCreator,
  canJoin,
  alreadyJoined,
  entryFee,
  modality,
}: Props) {
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
    router.refresh()
  }, [router])

  const showParticipants =
    isCreator || currentStatus === "open" || currentStatus === "in_progress" || currentStatus === "completed"

  const showBracket = currentStatus !== "draft"

  return (
    <>
      {/* Creator management panel */}
      {isCreator && (
        <TournamentManagePanel
          tournamentId={tournamentId}
          currentStatus={currentStatus}
          modality={modality}
          onRefresh={refresh}
        />
      )}

      {/* Join CTA */}
      {canJoin && (
        <JoinTournamentButton
          tournamentId={tournamentId}
          alreadyJoined={alreadyJoined}
          onRefresh={refresh}
        />
      )}

      {/* Already joined notice */}
      {!isCreator && alreadyJoined && currentStatus === "open" && (
        <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0]">
          <CheckCircle className="size-5 text-[#16a34a] shrink-0" />
          <p className="text-sm font-black text-[#16a34a]">Ya estás inscrito en este torneo</p>
        </div>
      )}

      {/* Closed notice for non-creators */}
      {!isCreator && currentStatus !== "open" && (
        <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-5 text-center">
          <p className="text-sm font-bold text-zinc-500">
            {currentStatus === "in_progress" ? "Este torneo ya está en curso." :
             currentStatus === "completed" ? "Este torneo ha finalizado." :
             currentStatus === "cancelled" ? "Este torneo fue cancelado." :
             "Las inscripciones aún no están abiertas."}
          </p>
        </div>
      )}

      {/* Participants — key remounts on refresh to re-fetch */}
      {showParticipants && (
        <ParticipantsManager
          key={`pm-${refreshKey}`}
          tournamentId={tournamentId}
          isCreator={isCreator}
          entryFee={entryFee}
          onRefresh={refresh}
        />
      )}

      {/* Bracket */}
      {showBracket && (
        <BracketView
          key={`bv-${refreshKey}`}
          tournamentId={tournamentId}
          isCreator={isCreator}
          modality={modality}
          tournamentStatus={currentStatus}
          onRefresh={refresh}
        />
      )}
    </>
  )
}
