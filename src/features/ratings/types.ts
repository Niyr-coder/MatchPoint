export interface RankingEntry {
  position: number
  userId: string
  fullName: string
  avatarUrl: string | null
  score: number
  wins: number
  losses: number
}
