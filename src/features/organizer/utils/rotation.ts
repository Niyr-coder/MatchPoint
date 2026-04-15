import type { QuedadaParticipant } from "@/features/organizer/types"

export interface ActiveMatch {
  courtIndex: number
  /** Increments each rotation so CourtCard resets its local score state */
  matchKey: number
  teamA: QuedadaParticipant[]
  teamB: QuedadaParticipant[]
  scoreA: number
  scoreB: number
}

export type MatchWinner = "A" | "B"

/** Returns "A" if scoreA >= scoreB, "B" otherwise */
export function determineWinner(scoreA: number, scoreB: number): MatchWinner {
  return scoreA >= scoreB ? "A" : "B"
}

/** Formats scores as "11-7" */
export function formatScore(scoreA: number, scoreB: number): string {
  return `${scoreA}-${scoreB}`
}

/** Number of players per team based on modality */
export function teamSize(modality: string): number {
  if (modality === "Dobles" || modality === "Mixtos") return 2
  return 1
}

/**
 * Splits the queue into active matches and remaining waiting queue.
 * Each court needs teamSize * 2 players.
 * Courts are filled in order — if there aren't enough players for a court, it is skipped.
 */
export function initializeMatches(
  queue: QuedadaParticipant[],
  courtCount: number,
  modality: string
): { activeMatches: ActiveMatch[]; waitingQueue: QuedadaParticipant[] } {
  const size = teamSize(modality)
  const playersPerCourt = size * 2
  const activeMatches: ActiveMatch[] = []
  let remaining = [...queue]

  for (let i = 0; i < courtCount; i++) {
    if (remaining.length < playersPerCourt) break
    const courtPlayers = remaining.splice(0, playersPerCourt)
    activeMatches.push({
      courtIndex: i,
      matchKey: 0,
      teamA: courtPlayers.slice(0, size),
      teamB: courtPlayers.slice(size),
      scoreA: 0,
      scoreB: 0,
    })
  }

  return { activeMatches, waitingQueue: remaining }
}

/**
 * King of the Court rotation: winner stays, loser(s) go to end of queue,
 * next player(s) in queue enter the court.
 */
export function applyKingRotation(
  match: ActiveMatch,
  winner: MatchWinner,
  queue: QuedadaParticipant[]
): { updatedMatch: ActiveMatch; updatedQueue: QuedadaParticipant[] } {
  const winnerTeam = winner === "A" ? match.teamA : match.teamB
  const loserTeam = winner === "A" ? match.teamB : match.teamA
  const size = winnerTeam.length
  const newQueue = [...queue]

  const entering = newQueue.splice(0, size)
  const updatedQueue = [...newQueue, ...loserTeam]

  const updatedMatch: ActiveMatch = {
    ...match,
    matchKey: match.matchKey + 1,
    teamA: winner === "A" ? winnerTeam : entering,
    teamB: winner === "B" ? winnerTeam : entering,
    scoreA: 0,
    scoreB: 0,
  }

  return { updatedMatch, updatedQueue }
}

/** True if any player in the match has no user_id (is a guest) */
export function hasGuest(match: ActiveMatch): boolean {
  return [...match.teamA, ...match.teamB].some(p => !p.user_id)
}
