import type { AppRole } from "@/features/auth/types"

export interface Club {
  id: string
  name: string
  slug: string
  description: string | null
  address: string | null
  city: string | null
  province: string | null
  phone: string | null
  logo_url: string | null
  cover_url: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ClubMember {
  id: string
  user_id: string
  club_id: string
  role: AppRole
  is_active: boolean
  joined_at: string
  updated_at: string
}

export type TeamRole = 'captain' | 'member'

export interface Team {
  id: string
  name: string
  description: string | null
  sport: 'futbol' | 'padel' | 'tenis' | 'pickleball' | null
  club_id: string | null
  created_by: string
  invite_code: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: TeamRole
  joined_at: string
}

export type ClubRequestStatus = 'pending' | 'approved' | 'rejected'

export interface ClubRequest {
  id: string
  user_id: string
  name: string
  city: string
  province: string
  description: string | null
  sports: string[]
  contact_phone: string | null
  contact_email: string | null
  status: ClubRequestStatus
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

// ────────────────────────────────────────────────
// Courts
// ────────────────────────────────────────────────

export type SportType = "futbol" | "padel" | "tenis" | "pickleball"

export interface Court {
  id: string
  club_id: string
  name: string
  sport: SportType
  surface_type: string | null
  is_indoor: boolean
  price_per_hour: number
  is_active: boolean
  created_at: string
  clubs?: { name: string; city: string | null }
}

export interface CourtSchedule {
  id: string
  court_id: string
  day_of_week: number
  open_time: string
  close_time: string
}

export interface CreateCourtInput {
  club_id: string
  name: string
  sport: SportType
  surface_type?: string | null
  is_indoor: boolean
  price_per_hour: number
}

export interface TimeSlot {
  startTime: string
  endTime: string
  available: boolean
}

// ────────────────────────────────────────────────
// Club Team (staff members)
// ────────────────────────────────────────────────

export interface ClubTeamMember {
  id: string
  userId: string
  fullName: string | null
  avatarUrl: string | null
  role: string
  phone: string | null
  isActive: boolean
  joinedAt: string
}

export interface ClientEntry {
  userId: string
  fullName: string | null
  phone: string | null
  totalReservations: number
  lastVisit: string | null
}

// ────────────────────────────────────────────────
// Coach
// ────────────────────────────────────────────────

export interface StudentEntry {
  id: string
  studentUserId: string
  fullName: string | null
  avatarUrl: string | null
  sport: string
  startedAt: string
  isActive: boolean
}

export interface EarningEntry {
  id: string
  amount: number
  description: string
  date: string
  created_at: string
}

export interface EarningsSummary {
  totalThisMonth: number
  totalAllTime: number
  studentsCount: number
}
