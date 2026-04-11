import { createClient, createServiceClient } from "@/lib/supabase/server"

export interface PlayerStats {
  reservationsThisMonth: number
  totalReservations: number
  tournamentsPlayed: number
  tournamentsWon: number
  rankingScore: number
}

export async function getPlayerStats(userId: string): Promise<PlayerStats> {
  const supabase = await createClient()

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]

  const [monthRes, totalRes, tournamentsRes, winsRes] = await Promise.all([
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("date", firstOfMonth)
      .neq("status", "cancelled"),

    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("status", "cancelled"),

    supabase
      .from("tournament_participants")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),

    supabase
      .from("tournament_participants")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "winner"),
  ])

  if (monthRes.error) throw new Error(monthRes.error.message)
  if (totalRes.error) throw new Error(totalRes.error.message)
  if (tournamentsRes.error) throw new Error(tournamentsRes.error.message)
  if (winsRes.error) throw new Error(winsRes.error.message)

  const tournamentsPlayed = tournamentsRes.count ?? 0
  const tournamentsWon = winsRes.count ?? 0

  // Ranking proxy: wins * 10 + participations * 2 + reservas * 1
  const rankingScore =
    tournamentsWon * 10 +
    tournamentsPlayed * 2 +
    (totalRes.count ?? 0)

  return {
    reservationsThisMonth: monthRes.count ?? 0,
    totalReservations: totalRes.count ?? 0,
    tournamentsPlayed,
    tournamentsWon,
    rankingScore,
  }
}

export interface MatchResult {
  id: string
  event_name: string
  event_type: 'tournament' | 'quedada' | 'event'
  sport: string
  modality: string | null
  result: 'win' | 'loss' | 'draw'
  score: string | null
  is_official: boolean
  rating_delta: number
  played_at: string
  opponent_name: string | null
  opponent_id: string | null
}

export interface PickleballPublicProfile {
  singles_rating: number | null
  doubles_rating: number | null
  skill_level: "beginner" | "intermediate" | "advanced" | "pro" | null
  dominant_hand: string | null
  play_style: string | null
  years_playing: number | null
}

export interface PublicPlayerProfile {
  rating: number
  ranking_position: number | null
  matches_played: number
  matches_won: number
  current_streak: number
  win_rate: number
  recentMatches: MatchResult[]
  clubs: Array<{ id: string; name: string; sport: string[] }>
  sports: Array<{ sport: string; count: number }>
  pickleballProfile: PickleballPublicProfile | null
}

export async function getPublicPlayerProfile(userId: string): Promise<PublicPlayerProfile> {
  const supabase = createServiceClient()

  const [profileRes, matchesRes, clubMembershipsRes, reservationsRes, pickleballRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('rating, ranking_position, matches_played, matches_won, current_streak')
      .eq('id', userId)
      .single(),

    supabase
      .from('match_results')
      .select('*')
      .eq('player_id', userId)
      .order('played_at', { ascending: false })
      .limit(10),

    supabase
      .from('club_members')
      .select('clubs(id, name)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(5),

    supabase
      .from('reservations')
      .select('courts(sport)')
      .eq('user_id', userId)
      .neq('status', 'cancelled')
      .limit(100),

    supabase
      .from('pickleball_profiles')
      .select('singles_rating, doubles_rating, skill_level, dominant_hand, play_style, years_playing')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const profile = profileRes.data
  const matchesPlayed = profile?.matches_played ?? 0
  const matchesWon = profile?.matches_won ?? 0
  const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0

  const sportCounts: Record<string, number> = {}
  const reservations = reservationsRes.data ?? []
  for (const r of reservations) {
    // Supabase may return the joined row as an object or array depending on the relation type
    const rawCourt = r.courts as unknown
    const court = Array.isArray(rawCourt) ? (rawCourt[0] as { sport: string } | undefined) : (rawCourt as { sport: string } | null)
    const sport = court?.sport
    if (sport) sportCounts[sport] = (sportCounts[sport] ?? 0) + 1
  }
  const sports = Object.entries(sportCounts)
    .map(([sport, count]) => ({ sport, count }))
    .sort((a, b) => b.count - a.count)

  type ClubMembershipRow = { clubs: { id: string; name: string } | { id: string; name: string }[] | null }
  const clubMemberships = (clubMembershipsRes.data ?? []) as ClubMembershipRow[]
  const clubs = clubMemberships
    .map((m) => {
      const clubData = Array.isArray(m.clubs) ? m.clubs[0] : m.clubs
      return {
        id: clubData?.id ?? '',
        name: clubData?.name ?? '',
        sport: [] as string[],
      }
    })
    .filter((c) => c.id)

  return {
    rating: Number(profile?.rating ?? 0),
    ranking_position: profile?.ranking_position ?? null,
    matches_played: matchesPlayed,
    matches_won: matchesWon,
    current_streak: profile?.current_streak ?? 0,
    win_rate: winRate,
    recentMatches: (matchesRes.data ?? []) as MatchResult[],
    clubs,
    sports,
    pickleballProfile: (pickleballRes.data as PickleballPublicProfile | null) ?? null,
  }
}
