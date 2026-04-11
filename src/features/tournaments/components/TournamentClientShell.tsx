"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { TournamentManagePanel } from "./TournamentManagePanel"
import { JoinTournamentButton } from "./JoinTournamentButton"
import { ParticipantsManager } from "@/components/dashboard/ParticipantsManager"
import { BracketView } from "@/features/tournaments/components/BracketView"
import { TournamentFeedbackForm } from "@/features/tournaments/components/TournamentFeedbackForm"
import { TournamentFeedbackList } from "@/features/tournaments/components/TournamentFeedbackList"
import { CheckCircle } from "lucide-react"
import type { TournamentStatus } from "@/features/tournaments/types"

type Tab = "participants" | "bracket" | "manage" | "feedback"

interface TabDef {
  key: Tab
  label: string
}

interface Props {
  tournamentId: string
  currentStatus: TournamentStatus
  isCreator: boolean
  canJoin: boolean
  alreadyJoined: boolean
  entryFee: number
  modality?: string | null
  bracketLocked: boolean
  isParticipant?: boolean
}

export function TournamentClientShell({
  tournamentId,
  currentStatus,
  isCreator,
  canJoin,
  alreadyJoined,
  entryFee,
  modality,
  bracketLocked,
  isParticipant,
}: Props) {
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)

  const showBracket = currentStatus !== "draft"

  const showFeedback = currentStatus === "completed" && (isParticipant || alreadyJoined || isCreator)

  const tabs: TabDef[] = [
    { key: "participants", label: "Participantes" },
    ...(showBracket ? [{ key: "bracket" as Tab, label: "Bracket" }] : []),
    ...(isCreator ? [{ key: "manage" as Tab, label: "Gestión" }] : []),
    ...(showFeedback ? [{ key: "feedback" as Tab, label: "Valoraciones" }] : []),
  ]

  const [activeTab, setActiveTab] = useState<Tab>("participants")

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
    router.refresh()
  }, [router])

  const showParticipants =
    isCreator || currentStatus === "open" || currentStatus === "in_progress" || currentStatus === "completed"

  return (
    <div className="flex flex-col gap-4">
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
        <div className="rounded-2xl bg-muted/50 border border-zinc-200 p-5 text-center">
          <p className="text-sm font-bold text-zinc-500">
            {currentStatus === "in_progress" ? "Este torneo ya está en curso." :
             currentStatus === "completed" ? "Este torneo ha finalizado." :
             currentStatus === "cancelled" ? "Este torneo fue cancelado." :
             "Las inscripciones aún no están abiertas."}
          </p>
        </div>
      )}

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-[0.12em] transition-colors ${
                activeTab === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab: Participantes */}
      <div className={activeTab === "participants" || tabs.length === 1 ? undefined : "hidden"}>
        {showParticipants && (
          <ParticipantsManager
            tournamentId={tournamentId}
            tournamentStatus={currentStatus}
            isCreator={isCreator}
            entryFee={entryFee}
            refreshTrigger={refreshKey}
            onRefresh={refresh}
          />
        )}
      </div>

      {/* Tab: Bracket */}
      <div className={activeTab === "bracket" || tabs.length === 1 ? undefined : "hidden"}>
        {showBracket && (
          <BracketView
            key={`bv-${refreshKey}`}
            tournamentId={tournamentId}
            isCreator={isCreator}
            modality={modality}
            tournamentStatus={currentStatus}
            bracketLocked={bracketLocked}
            onRefresh={refresh}
          />
        )}
      </div>

      {/* Tab: Gestión (creator only) */}
      {isCreator && (tabs.length === 1 || activeTab === "manage") && (
        <TournamentManagePanel
          tournamentId={tournamentId}
          currentStatus={currentStatus}
          modality={modality}
          onRefresh={refresh}
        />
      )}

      {/* Tab: Valoraciones */}
      {showFeedback && activeTab === "feedback" && (
        <div className="flex flex-col gap-4">
          {(alreadyJoined || isParticipant) && !isCreator && (
            <TournamentFeedbackForm tournamentId={tournamentId} />
          )}
          <TournamentFeedbackList tournamentId={tournamentId} />
        </div>
      )}
    </div>
  )
}
