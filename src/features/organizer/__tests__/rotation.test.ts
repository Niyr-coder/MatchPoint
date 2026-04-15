import { describe, it, expect } from "vitest"
import {
  determineWinner,
  formatScore,
  teamSize,
  initializeMatches,
  applyKingRotation,
  hasGuest,
} from "../utils/rotation"
import type { QuedadaParticipant } from "../types"

function makePlayer(id: string, guestName?: string): QuedadaParticipant {
  return {
    id: `part-${id}`,
    user_id: guestName ? null : id,
    tournament_id: "t1",
    status: "registered",
    registered_at: new Date().toISOString(),
    guest_name: guestName ?? null,
    guest_lastname: null,
    profiles: guestName ? null : { id, username: id, full_name: id, avatar_url: null },
  }
}

const p = (id: string) => makePlayer(id)
const g = (id: string) => makePlayer(id, `Guest ${id}`)

describe("determineWinner", () => {
  it("returns A when scoreA > scoreB", () => {
    expect(determineWinner(11, 7)).toBe("A")
  })
  it("returns B when scoreB > scoreA", () => {
    expect(determineWinner(5, 11)).toBe("B")
  })
  it("returns A on tie (tiebreak favors A)", () => {
    expect(determineWinner(11, 11)).toBe("A")
  })
})

describe("formatScore", () => {
  it("formats score as 'A-B'", () => {
    expect(formatScore(11, 7)).toBe("11-7")
  })
})

describe("teamSize", () => {
  it("returns 1 for Singles", () => expect(teamSize("Singles")).toBe(1))
  it("returns 2 for Dobles", () => expect(teamSize("Dobles")).toBe(2))
  it("returns 2 for Mixtos", () => expect(teamSize("Mixtos")).toBe(2))
  it("defaults to 1 for unknown", () => expect(teamSize("Unknown")).toBe(1))
})

describe("initializeMatches", () => {
  const players = [p("1"), p("2"), p("3"), p("4"), p("5"), p("6")]

  it("puts first 2 players on court 1 in singles", () => {
    const { activeMatches, waitingQueue } = initializeMatches(players, 1, "Singles")
    expect(activeMatches).toHaveLength(1)
    expect(activeMatches[0].teamA).toHaveLength(1)
    expect(activeMatches[0].teamA[0].user_id).toBe("1")
    expect(activeMatches[0].teamB[0].user_id).toBe("2")
    expect(waitingQueue).toHaveLength(4)
  })

  it("puts first 4 players on court 1 in doubles", () => {
    const { activeMatches, waitingQueue } = initializeMatches(players, 1, "Dobles")
    expect(activeMatches[0].teamA).toHaveLength(2)
    expect(activeMatches[0].teamB).toHaveLength(2)
    expect(waitingQueue).toHaveLength(2)
  })

  it("fills 2 courts in singles", () => {
    const { activeMatches, waitingQueue } = initializeMatches(players, 2, "Singles")
    expect(activeMatches).toHaveLength(2)
    expect(waitingQueue).toHaveLength(2)
  })

  it("handles fewer players than needed for all courts", () => {
    const few = [p("1"), p("2"), p("3")]
    const { activeMatches } = initializeMatches(few, 2, "Singles")
    expect(activeMatches).toHaveLength(1)
  })
})

describe("applyKingRotation", () => {
  const match = {
    courtIndex: 0,
    matchKey: 0,
    teamA: [p("1")],
    teamB: [p("2")],
    scoreA: 11,
    scoreB: 7,
  }
  const queue = [p("3"), p("4")]

  it("winner A stays, loser B goes to end of queue, first in queue enters", () => {
    const result = applyKingRotation(match, "A", queue)
    expect(result.updatedMatch.teamA[0].user_id).toBe("1")
    expect(result.updatedMatch.teamB[0].user_id).toBe("3")
    expect(result.updatedQueue[0].user_id).toBe("4")
    expect(result.updatedQueue[result.updatedQueue.length - 1].user_id).toBe("2")
  })

  it("winner B stays, loser A goes to end of queue", () => {
    const result = applyKingRotation({ ...match, scoreA: 5, scoreB: 11 }, "B", queue)
    expect(result.updatedMatch.teamB[0].user_id).toBe("2")
    expect(result.updatedMatch.teamA[0].user_id).toBe("3")
    expect(result.updatedQueue[result.updatedQueue.length - 1].user_id).toBe("1")
  })
})

describe("hasGuest", () => {
  it("returns true when teamA has a guest", () => {
    const match = { courtIndex: 0, matchKey: 0, teamA: [g("x")], teamB: [p("1")], scoreA: 0, scoreB: 0 }
    expect(hasGuest(match)).toBe(true)
  })
  it("returns false when all players are registered", () => {
    const match = { courtIndex: 0, matchKey: 0, teamA: [p("1")], teamB: [p("2")], scoreA: 0, scoreB: 0 }
    expect(hasGuest(match)).toBe(false)
  })
})
