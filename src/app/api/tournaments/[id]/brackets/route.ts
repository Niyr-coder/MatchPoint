import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const service = await createServiceClient()
  const { data, error } = await service
    .from("tournament_brackets")
    .select(`
      id, round, match_number, score, status,
      player1:player1_id ( id, username, full_name ),
      player2:player2_id ( id, username, full_name ),
      winner:winner_id  ( id, username, full_name )
    `)
    .eq("tournament_id", id)
    .order("round", { ascending: true })
    .order("match_number", { ascending: true })

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data ?? [] })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("created_by, modality, bracket_locked")
    .eq("id", id)
    .single()

  if (!tournament || tournament.created_by !== user.id) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  if (tournament.bracket_locked) {
    return NextResponse.json({
      success: false,
      error: "El bracket está bloqueado porque ya hay partidos con resultado registrado.",
    }, { status: 409 })
  }

  const body = await request.json() as { type?: string }
  const type = body.type ?? "elimination"

  const service = await createServiceClient()

  // Fetch confirmed participants (or any registered if none confirmed)
  const { data: participants, error: pErr } = await service
    .from("tournament_participants")
    .select("user_id, seed")
    .eq("tournament_id", id)
    .order("seed", { ascending: true, nullsFirst: false })
    .order("registered_at", { ascending: true })

  if (pErr) return NextResponse.json({ success: false, error: pErr.message }, { status: 500 })
  if (!participants || participants.length < 2) {
    return NextResponse.json({ success: false, error: "Se necesitan al menos 2 participantes" }, { status: 400 })
  }

  // Shuffle for fairness if no seeds assigned; keep seeded order if seeds exist
  const unseeded = participants.every(p => !p.seed)
  const players = unseeded
    ? shuffleArray(participants.map(p => p.user_id))
    : participants.map(p => p.user_id)

  let brackets: BracketInsert[]

  if (type === "round_robin") {
    brackets = generateRoundRobin(id, players)
  } else {
    brackets = generateElimination(id, players)
  }

  // Clear existing brackets first
  await service.from("tournament_brackets").delete().eq("tournament_id", id)

  const { data: inserted, error: iErr } = await service
    .from("tournament_brackets")
    .insert(brackets)
    .select()

  if (iErr) return NextResponse.json({ success: false, error: iErr.message }, { status: 500 })
  return NextResponse.json({ success: true, data: inserted, type })
}

interface BracketInsert {
  tournament_id: string
  round: number
  match_number: number
  player1_id: string | null
  player2_id: string | null
  status: string
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateElimination(tournamentId: string, players: string[]): BracketInsert[] {
  const n = players.length
  // Next power of 2
  let size = 1
  while (size < n) size *= 2
  const byes = size - n

  // A6: Distribute byes to top seeds so seeds 1..byes auto-advance
  // instead of stacking byes at the end where all top seeds play each other R1.
  // Layout: [seed1, BYE, seed2, BYE, ..., seedN-1, seedN, ...]
  const slots: (string | null)[] = []
  for (let i = 0; i < byes; i++) {
    slots.push(players[i]) // top seed gets the bye
    slots.push(null)
  }
  for (let i = byes; i < n; i++) {
    slots.push(players[i])
  }

  const brackets: BracketInsert[] = []
  let matchNum = 1
  for (let i = 0; i < slots.length; i += 2) {
    const p1 = slots[i] ?? null
    const p2 = slots[i + 1] ?? null
    brackets.push({
      tournament_id: tournamentId,
      round: 1,
      match_number: matchNum++,
      player1_id: p1,
      player2_id: p2,
      status: p2 === null ? "bye" : "pending",
    })
  }

  // Placeholder rounds
  let currentMatches = size / 2
  let round = 2
  while (currentMatches > 1) {
    for (let i = 0; i < currentMatches / 2; i++) {
      brackets.push({
        tournament_id: tournamentId,
        round,
        match_number: i + 1,
        player1_id: null,
        player2_id: null,
        status: "pending",
      })
    }
    currentMatches /= 2
    round++
  }

  return brackets
}

function generateRoundRobin(tournamentId: string, players: string[]): BracketInsert[] {
  const brackets: BracketInsert[] = []
  let matchNum = 1
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      brackets.push({
        tournament_id: tournamentId,
        round: 1,
        match_number: matchNum++,
        player1_id: players[i],
        player2_id: players[j],
        status: "pending",
      })
    }
  }
  return brackets
}
