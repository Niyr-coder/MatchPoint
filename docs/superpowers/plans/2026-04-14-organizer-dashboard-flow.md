# Organizer Dashboard — Bracket, Rotation & Courts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full match/bracket functionality and a court selector to the organizer quedada management panel (`/dashboard/organizer/[id]`).

**Architecture:** Extract the tab "Bracket / Resultados" from `QuedadaManagePanel` into two dedicated components: `RotationPanel` (dinámicas `king_of_court` / `popcorn`) and `BracketPanel` (dinámicas `standard` / `round_robin`). A new API route persists rotation match results in `tournament_brackets`. The existing tournament bracket system is reused unchanged for `BracketPanel`.

**Tech Stack:** Next.js 16 App Router · TypeScript · Supabase (`tournament_brackets`, service client) · Vitest · React state (rotation queue not persisted — refresh resets it)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/features/organizer/utils/rotation.ts` | Pure functions: winner detection, score formatting, queue initialization, rotation logic |
| Create | `src/features/organizer/__tests__/rotation.test.ts` | Vitest unit tests for rotation utils |
| Create | `src/app/api/quedadas/[id]/rotation/match/route.ts` | `POST` — persists a rotation match result to `tournament_brackets` |
| Create | `src/features/organizer/components/RotationPanel.tsx` | Court selector + active matches + score entry + queue |
| Create | `src/features/organizer/components/BracketPanel.tsx` | Thin wrapper over `BracketView` for quedadas |
| Modify | `src/features/organizer/components/QuedadaManagePanel.tsx` | Replace tab "Bracket / Resultados" body with `<RotationPanel>` or `<BracketPanel>` |

---

## Task 1: Rotation utility functions

**Files:**
- Create: `src/features/organizer/utils/rotation.ts`
- Create: `src/features/organizer/__tests__/rotation.test.ts`

These are pure functions with no side effects. Test them first.

- [ ] **Step 1: Write failing tests**

Create `src/features/organizer/__tests__/rotation.test.ts`:

```ts
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

// Helpers
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
    // Only 1 court can be filled (needs 4 players for 2 courts)
    expect(activeMatches).toHaveLength(1)
  })
})

describe("applyKingRotation", () => {
  const match = {
    courtIndex: 0,
    teamA: [p("1")],
    teamB: [p("2")],
    scoreA: 11,
    scoreB: 7,
  }
  const queue = [p("3"), p("4")]

  it("winner A stays, loser B goes to end of queue, first in queue enters", () => {
    const result = applyKingRotation(match, "A", queue)
    expect(result.updatedMatch.teamA[0].user_id).toBe("1") // winner stays
    expect(result.updatedMatch.teamB[0].user_id).toBe("3") // next in queue
    expect(result.updatedQueue[0].user_id).toBe("4")
    expect(result.updatedQueue[result.updatedQueue.length - 1].user_id).toBe("2") // loser at end
  })

  it("winner B stays, loser A goes to end of queue", () => {
    const result = applyKingRotation({ ...match, scoreA: 5, scoreB: 11 }, "B", queue)
    expect(result.updatedMatch.teamB[0].user_id).toBe("2") // winner stays
    expect(result.updatedMatch.teamA[0].user_id).toBe("3") // next in queue
    expect(result.updatedQueue[result.updatedQueue.length - 1].user_id).toBe("1") // loser at end
  })
})

describe("hasGuest", () => {
  it("returns true when teamA has a guest", () => {
    const match = { courtIndex: 0, teamA: [g("x")], teamB: [p("1")], scoreA: 0, scoreB: 0 }
    expect(hasGuest(match)).toBe(true)
  })
  it("returns false when all players are registered", () => {
    const match = { courtIndex: 0, teamA: [p("1")], teamB: [p("2")], scoreA: 0, scoreB: 0 }
    expect(hasGuest(match)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — expect them to fail**

```bash
cd /home/reu/Escritorio/MATCHPOINT && npx vitest run src/features/organizer/__tests__/rotation.test.ts 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module '../utils/rotation'`

- [ ] **Step 3: Create the utility file**

Create `src/features/organizer/utils/rotation.ts`:

```ts
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

  // How many players enter from queue
  const entering = newQueue.splice(0, size)
  // Losers go to end of queue
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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd /home/reu/Escritorio/MATCHPOINT && npx vitest run src/features/organizer/__tests__/rotation.test.ts 2>&1 | tail -20
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
cd /home/reu/Escritorio/MATCHPOINT && git add src/features/organizer/utils/rotation.ts src/features/organizer/__tests__/rotation.test.ts && git commit -m "feat(organizer): rotation utility functions with tests"
```

---

## Task 2: Rotation match API route

**Files:**
- Create: `src/app/api/quedadas/[id]/rotation/match/route.ts`

- [ ] **Step 1: Write validation unit test**

Create `src/app/api/quedadas/[id]/rotation/match/__tests__/schema.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { z } from "zod"

const rotationMatchSchema = z.object({
  player1Id: z.string().uuid(),
  player2Id: z.string().uuid(),
  scoreA: z.number().int().min(0),
  scoreB: z.number().int().min(0),
})

describe("rotationMatchSchema", () => {
  it("accepts valid input", () => {
    const result = rotationMatchSchema.safeParse({
      player1Id: "11111111-1111-1111-1111-111111111111",
      player2Id: "22222222-2222-2222-2222-222222222222",
      scoreA: 11,
      scoreB: 7,
    })
    expect(result.success).toBe(true)
  })

  it("rejects negative scores", () => {
    const result = rotationMatchSchema.safeParse({
      player1Id: "11111111-1111-1111-1111-111111111111",
      player2Id: "22222222-2222-2222-2222-222222222222",
      scoreA: -1,
      scoreB: 7,
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-uuid player ids", () => {
    const result = rotationMatchSchema.safeParse({
      player1Id: "not-a-uuid",
      player2Id: "22222222-2222-2222-2222-222222222222",
      scoreA: 11,
      scoreB: 7,
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing fields", () => {
    const result = rotationMatchSchema.safeParse({ player1Id: "11111111-1111-1111-1111-111111111111" })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd /home/reu/Escritorio/MATCHPOINT && npx vitest run "src/app/api/quedadas/**/__tests__/schema.test.ts" 2>&1 | tail -20
```

Expected: FAIL — cannot find module

- [ ] **Step 3: Create the API route**

Create `src/app/api/quedadas/[id]/rotation/match/route.ts`:

```ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { determineWinner, formatScore } from "@/features/organizer/utils/rotation"

const rotationMatchSchema = z.object({
  player1Id: z.string().uuid(),
  player2Id: z.string().uuid(),
  scoreA: z.number().int().min(0),
  scoreB: z.number().int().min(0),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: quedadaId } = await params

  // Auth — must be the quedada creator
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 })
  }

  const { data: quedada } = await supabase
    .from("tournaments")
    .select("created_by, event_type")
    .eq("id", quedadaId)
    .single()

  if (!quedada || quedada.event_type !== "quedada" || quedada.created_by !== user.id) {
    return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 })
  }

  // Parse body
  let raw: unknown
  try { raw = await request.json() } catch { raw = {} }

  const parsed = rotationMatchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { player1Id, player2Id, scoreA, scoreB } = parsed.data
  const winner = determineWinner(scoreA, scoreB)
  const winnerId = winner === "A" ? player1Id : player2Id
  const loserId = winner === "A" ? player2Id : player1Id

  const service = createServiceClient()

  // Compute next match_number for this quedada's rotation matches (round = 0)
  const { data: maxRow } = await service
    .from("tournament_brackets")
    .select("match_number")
    .eq("tournament_id", quedadaId)
    .eq("round", 0)
    .order("match_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  const matchNumber = (maxRow?.match_number ?? 0) + 1

  const { data, error } = await service
    .from("tournament_brackets")
    .insert({
      tournament_id: quedadaId,
      round: 0,
      match_number: matchNumber,
      player1_id: player1Id,
      player2_id: player2Id,
      winner_id: winnerId,
      score: formatScore(scoreA, scoreB),
      status: "completed",
    })
    .select("id, winner_id")
    .single()

  if (error) {
    console.error("[POST /api/quedadas/[id]/rotation/match]", error.message)
    return NextResponse.json({ success: false, data: null, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: { matchId: data.id, winnerId, loserId },
    error: null,
  }, { status: 201 })
}
```

- [ ] **Step 4: Move the schema test to the route file's directory, then run**

```bash
mkdir -p /home/reu/Escritorio/MATCHPOINT/src/app/api/quedadas/\[id\]/rotation/match/__tests__
```

The test file was already placed in the right location in Step 1. Run it:

```bash
cd /home/reu/Escritorio/MATCHPOINT && npx vitest run "src/app/api/quedadas" 2>&1 | tail -20
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
cd /home/reu/Escritorio/MATCHPOINT && git add src/app/api/quedadas/ && git commit -m "feat(organizer): rotation match API route"
```

---

## Task 3: RotationPanel component

**Files:**
- Create: `src/features/organizer/components/RotationPanel.tsx`

The component manages all rotation game state locally. Rotation queue is not persisted — page refresh resets it.

- [ ] **Step 1: Create RotationPanel**

Create `src/features/organizer/components/RotationPanel.tsx`:

```tsx
"use client"

import { useState, useCallback } from "react"
import { RefreshCw } from "lucide-react"
import {
  initializeMatches,
  applyKingRotation,
  determineWinner,
  hasGuest,
  teamSize,
  type ActiveMatch,
  type MatchWinner,
} from "@/features/organizer/utils/rotation"
import type { QuedadaParticipant } from "@/features/organizer/types"

const COURT_OPTIONS = [1, 2, 3, 4] as const
type CourtCount = (typeof COURT_OPTIONS)[number]

interface Props {
  quedadaId: string
  dynamic: "king_of_court" | "popcorn"
  participants: QuedadaParticipant[]
  modality: string
}

function displayName(p: QuedadaParticipant): string {
  if (p.guest_name) return `${p.guest_name} ${p.guest_lastname ?? ""}`.trim()
  return p.profiles?.full_name ?? p.profiles?.username ?? "Jugador"
}

function teamLabel(team: QuedadaParticipant[]): string {
  return team.map(displayName).join(" / ")
}

interface CourtCardProps {
  match: ActiveMatch
  onSubmit: (match: ActiveMatch, scoreA: number, scoreB: number) => Promise<void>
  submitting: boolean
}

function CourtCard({ match, onSubmit, submitting }: CourtCardProps) {
  const [scoreA, setScoreA] = useState(0)
  const [scoreB, setScoreB] = useState(0)
  const courtNum = match.courtIndex + 1

  return (
    <div className="border-2 border-green-300 rounded-2xl p-4 bg-green-50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black uppercase tracking-wide text-green-700">
          Cancha {courtNum} — En juego
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
        {/* Team A */}
        <div className="bg-white border border-green-200 rounded-xl p-3 text-center">
          <div className="text-[11px] font-black mb-1 truncate">{teamLabel(match.teamA)}</div>
          <input
            type="number"
            min={0}
            max={99}
            value={scoreA}
            onChange={e => setScoreA(Math.max(0, Number(e.target.value)))}
            className="w-14 h-11 border-2 border-green-400 rounded-xl text-center text-xl font-black bg-white focus:outline-none"
          />
        </div>

        <span className="text-[10px] font-black text-zinc-400">VS</span>

        {/* Team B */}
        <div className="bg-white border border-green-200 rounded-xl p-3 text-center">
          <div className="text-[11px] font-black mb-1 truncate">{teamLabel(match.teamB)}</div>
          <input
            type="number"
            min={0}
            max={99}
            value={scoreB}
            onChange={e => setScoreB(Math.max(0, Number(e.target.value)))}
            className="w-14 h-11 border-2 border-border rounded-xl text-center text-xl font-black bg-white focus:outline-none"
          />
        </div>
      </div>

      <button
        disabled={submitting || (scoreA === 0 && scoreB === 0)}
        onClick={() => void onSubmit(match, scoreA, scoreB)}
        className="mt-3 w-full py-2.5 bg-foreground text-white rounded-xl text-[11px] font-black uppercase tracking-wide hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {submitting && <RefreshCw className="size-3 animate-spin" />}
        Registrar resultado → rotar
      </button>
    </div>
  )
}

/** Popcorn: after a match, winner picks who enters from the queue */
interface PopcornPickerProps {
  queue: QuedadaParticipant[]
  slotsNeeded: number
  onPick: (picked: QuedadaParticipant[]) => void
}

function PopcornPicker({ queue, slotsNeeded, onPick }: PopcornPickerProps) {
  const [selected, setSelected] = useState<QuedadaParticipant[]>([])

  function toggle(p: QuedadaParticipant) {
    setSelected(prev =>
      prev.find(x => x.id === p.id)
        ? prev.filter(x => x.id !== p.id)
        : prev.length < slotsNeeded
        ? [...prev, p]
        : prev
    )
  }

  return (
    <div className="border-2 border-blue-300 rounded-2xl p-4 bg-blue-50">
      <p className="text-[10px] font-black uppercase tracking-wide text-blue-700 mb-3">
        Popcorn — Elige {slotsNeeded} jugador{slotsNeeded > 1 ? "es" : ""} que entra{slotsNeeded > 1 ? "n" : ""}
      </p>
      <div className="flex flex-col gap-2">
        {queue.map(p => {
          const isSelected = !!selected.find(x => x.id === p.id)
          return (
            <button
              key={p.id}
              onClick={() => toggle(p)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                isSelected
                  ? "border-blue-400 bg-white"
                  : "border-blue-200 bg-white/50 hover:border-blue-300"
              }`}
            >
              <span className="text-sm font-bold flex-1">{displayName(p)}</span>
              {isSelected && <span className="text-[10px] font-black text-blue-600">✓</span>}
            </button>
          )
        })}
      </div>
      <button
        disabled={selected.length < slotsNeeded}
        onClick={() => onPick(selected)}
        className="mt-3 w-full py-2.5 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wide hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Confirmar selección
      </button>
    </div>
  )
}

export function RotationPanel({ quedadaId, dynamic, participants, modality }: Props) {
  const [courtCount, setCourtCount] = useState<CourtCount>(1)
  const [initialized, setInitialized] = useState(false)
  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([])
  const [queue, setQueue] = useState<QuedadaParticipant[]>([])
  const [submittingCourt, setSubmittingCourt] = useState<number | null>(null)
  // Popcorn: pending pick state after a result is submitted
  const [popcornPending, setPopcornPending] = useState<{
    match: ActiveMatch
    winner: MatchWinner
  } | null>(null)

  function start() {
    const { activeMatches: matches, waitingQueue } = initializeMatches(
      participants,
      courtCount,
      modality
    )
    setActiveMatches(matches)
    setQueue(waitingQueue)
    setInitialized(true)
  }

  const handleSubmit = useCallback(
    async (match: ActiveMatch, scoreA: number, scoreB: number) => {
      setSubmittingCourt(match.courtIndex)
      const winner = determineWinner(scoreA, scoreB)

      // Only persist if no guests involved
      if (!hasGuest(match)) {
        const rep1 = match.teamA[0].user_id!
        const rep2 = match.teamB[0].user_id!
        try {
          await fetch(`/api/quedadas/${quedadaId}/rotation/match`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ player1Id: rep1, player2Id: rep2, scoreA, scoreB }),
          })
        } catch {
          // Non-fatal — queue rotation continues even if persistence fails
        }
      }

      if (dynamic === "popcorn" && queue.length > 0) {
        setPopcornPending({ match, winner })
        setSubmittingCourt(null)
        return
      }

      // King of the Court rotation
      const { updatedMatch, updatedQueue } = applyKingRotation(match, winner, queue)
      setActiveMatches(prev =>
        prev.map(m => (m.courtIndex === match.courtIndex ? { ...updatedMatch, scoreA: 0, scoreB: 0 } : m))
      )
      setQueue(updatedQueue)
      setSubmittingCourt(null)
    },
    [quedadaId, dynamic, queue]
  )

  function handlePopcornPick(picked: QuedadaParticipant[]) {
    if (!popcornPending) return
    const { match, winner } = popcornPending
    const loserTeam = winner === "A" ? match.teamB : match.teamA
    const winnerTeam = winner === "A" ? match.teamA : match.teamB
    const size = teamSize(modality)

    // Remove picked from queue, add losers to end
    const newQueue = queue
      .filter(p => !picked.find(pk => pk.id === p.id))
      .concat(loserTeam)

    const updatedMatch: ActiveMatch = {
      ...match,
      matchKey: match.matchKey + 1,
      teamA: winner === "A" ? winnerTeam : picked.slice(0, size),
      teamB: winner === "B" ? winnerTeam : picked.slice(0, size),
      scoreA: 0,
      scoreB: 0,
    }

    setActiveMatches(prev =>
      prev.map(m => (m.courtIndex === match.courtIndex ? updatedMatch : m))
    )
    setQueue(newQueue)
    setPopcornPending(null)
  }

  const DYNAMIC_DESC: Record<string, string> = {
    king_of_court: "Ganador permanece en cancha. Perdedor rota al final de la fila.",
    popcorn: "Ganador elige quién entra a continuación.",
  }

  if (!initialized) {
    const size = teamSize(modality)
    const minPlayers = courtCount * size * 2

    return (
      <div className="flex flex-col gap-4">
        <div className="bg-muted rounded-xl p-4">
          <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-1">
            {dynamic === "king_of_court" ? "King of the Court" : "Popcorn"}
          </p>
          <p className="text-xs text-zinc-500">{DYNAMIC_DESC[dynamic]}</p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
            Canchas activas
          </span>
          <div className="flex gap-1.5">
            {COURT_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => setCourtCount(n)}
                className={`size-8 rounded-lg border-2 text-sm font-black transition-colors ${
                  courtCount === n
                    ? "border-foreground bg-foreground text-white"
                    : "border-border hover:border-foreground/50 text-zinc-600"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {participants.length < minPlayers && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-xs text-yellow-700">
            Necesitas al menos {minPlayers} jugadores para {courtCount}{" "}
            {courtCount === 1 ? "cancha" : "canchas"} en {modality}. Tienes{" "}
            {participants.length}.
          </div>
        )}

        <button
          disabled={participants.length < minPlayers}
          onClick={start}
          className="w-full py-3 bg-foreground text-white rounded-xl text-[11px] font-black uppercase tracking-wide hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Iniciar scoreboard
        </button>
      </div>
    )
  }

  const slotsForPopcorn = popcornPending
    ? (popcornPending.winner === "A" ? popcornPending.match.teamB : popcornPending.match.teamA).length
    : 0

  return (
    <div className="flex flex-col gap-4">
      {/* Popcorn picker overlay */}
      {popcornPending && queue.length > 0 && (
        <PopcornPicker
          queue={queue}
          slotsNeeded={slotsForPopcorn}
          onPick={handlePopcornPick}
        />
      )}

      {/* Active courts */}
      {!popcornPending &&
        activeMatches.map(match => (
          <CourtCard
            key={`${match.courtIndex}-${match.matchKey}`}
            match={match}
            submitting={submittingCourt === match.courtIndex}
            onSubmit={handleSubmit}
          />
        ))}

      {/* Waiting queue */}
      {queue.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-2">
            Fila de espera ({queue.length})
          </p>
          <div className="flex flex-col gap-2">
            {queue.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
              >
                <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[11px] font-black text-zinc-500 shrink-0">
                  {i + 1}
                </div>
                <span className="text-sm font-bold flex-1 truncate">{displayName(p)}</span>
                {p.guest_name && (
                  <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold">
                    INVITADO
                  </span>
                )}
                {i === 0 && !popcornPending && (
                  <span className="text-[10px] text-zinc-400 font-bold">Siguiente</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setInitialized(false)}
        className="text-[11px] text-zinc-400 hover:text-zinc-600 font-bold underline self-center transition-colors"
      >
        Reiniciar scoreboard
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/reu/Escritorio/MATCHPOINT && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
cd /home/reu/Escritorio/MATCHPOINT && git add src/features/organizer/components/RotationPanel.tsx && git commit -m "feat(organizer): RotationPanel with court selector and score entry"
```

---

## Task 4: BracketPanel component

**Files:**
- Create: `src/features/organizer/components/BracketPanel.tsx`

Wraps the existing `BracketView` component, passing quedada-appropriate props. `BracketView` handles all data fetching, bracket generation, and score entry internally.

- [ ] **Step 1: Create BracketPanel**

Create `src/features/organizer/components/BracketPanel.tsx`:

```tsx
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
      // Quedadas skip formal status — always allow match editing
      tournamentStatus="in_progress"
      bracketLocked={false}
    />
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/reu/Escritorio/MATCHPOINT && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
cd /home/reu/Escritorio/MATCHPOINT && git add src/features/organizer/components/BracketPanel.tsx && git commit -m "feat(organizer): BracketPanel wrapping existing BracketView"
```

---

## Task 5: Wire QuedadaManagePanel

**Files:**
- Modify: `src/features/organizer/components/QuedadaManagePanel.tsx`

Replace the static tab "Bracket / Resultados" body with `<RotationPanel>` or `<BracketPanel>` based on `quedada.game_dynamic`.

- [ ] **Step 1: Read the current file**

Read `src/features/organizer/components/QuedadaManagePanel.tsx` lines 1–30 to confirm current imports.

- [ ] **Step 2: Add imports**

In `src/features/organizer/components/QuedadaManagePanel.tsx`, replace:

```tsx
import { Swords, Link2, UserPlus, Trash2 } from "lucide-react"
import { AddPlayerModal } from "@/features/organizer/components/AddPlayerModal"
import { RotationScoreboard } from "@/features/organizer/components/RotationScoreboard"
```

with:

```tsx
import { Link2, UserPlus, Trash2 } from "lucide-react"
import { AddPlayerModal } from "@/features/organizer/components/AddPlayerModal"
import { RotationPanel } from "@/features/organizer/components/RotationPanel"
import { BracketPanel } from "@/features/organizer/components/BracketPanel"
```

- [ ] **Step 3: Remove the `USES_BRACKET` constant**

Remove this line (it is no longer used):

```tsx
const USES_BRACKET = ["standard", "round_robin"]
```

- [ ] **Step 4: Replace the tab body**

Replace the entire `{/* TAB: Bracket / Resultados */}` block:

```tsx
      {/* TAB: Bracket / Resultados */}
      {tab === "Bracket / Resultados" && (
        <div>
          {hasBracket ? (
            <div className="text-center py-8 text-zinc-400 text-sm border border-dashed border-border rounded-2xl">
              <Swords className="size-8 mx-auto mb-2 text-zinc-300" />
              El bracket se genera al iniciar la quedada.
              <br />
              <span className="text-xs">
                Usa el botón "Iniciar" cuando todos los jugadores estén listos.
              </span>
            </div>
          ) : (
            <RotationScoreboard
              quedadaId={quedada.id}
              dynamic={quedada.game_dynamic ?? "king_of_court"}
              participants={participants}
            />
          )}
        </div>
      )}
```

with:

```tsx
      {/* TAB: Bracket / Resultados */}
      {tab === "Bracket / Resultados" && (
        <div>
          {quedada.game_dynamic === "standard" || quedada.game_dynamic === "round_robin" ? (
            <BracketPanel quedada={quedada} participantCount={participants.length} />
          ) : (
            <RotationPanel
              quedadaId={quedada.id}
              dynamic={quedada.game_dynamic ?? "king_of_court"}
              participants={participants}
              modality={quedada.modality}
            />
          )}
        </div>
      )}
```

- [ ] **Step 5: Remove the unused `hasBracket` variable**

Remove this line from the component body (it was referencing `USES_BRACKET`):

```tsx
  const hasBracket = USES_BRACKET.includes(quedada.game_dynamic ?? "standard")
```

- [ ] **Step 6: Type-check**

```bash
cd /home/reu/Escritorio/MATCHPOINT && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors

- [ ] **Step 7: Run all tests**

```bash
cd /home/reu/Escritorio/MATCHPOINT && npx vitest run 2>&1 | tail -20
```

Expected: all existing tests pass + new tests pass

- [ ] **Step 8: Commit**

```bash
cd /home/reu/Escritorio/MATCHPOINT && git add src/features/organizer/components/QuedadaManagePanel.tsx && git commit -m "feat(organizer): wire RotationPanel and BracketPanel in QuedadaManagePanel"
```

---

## Verification

After all tasks:

1. Open `/dashboard/organizer` — create or select a quedada
2. Go to tab "Bracket / Resultados"
3. **King of the Court / Popcorn quedada:**
   - Court selector (1-4) appears
   - "Iniciar scoreboard" button activates with enough players
   - Score entry works, rotation updates queue
4. **Standard / Round Robin quedada:**
   - "Generar bracket" button appears (if no bracket) or bracket renders (if generated)
   - Score entry on each match works
5. Open DevTools Network — rotation match calls `POST /api/quedadas/[id]/rotation/match` and returns 201
