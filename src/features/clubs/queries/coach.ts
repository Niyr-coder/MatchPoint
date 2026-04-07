import { createServiceClient } from "@/lib/supabase/server"
import type { StudentEntry, EarningEntry, EarningsSummary } from "@/features/clubs/types"

export type { StudentEntry, EarningEntry, EarningsSummary } from "@/features/clubs/types"

export async function getCoachStudents(
  coachUserId: string,
  clubId: string
): Promise<StudentEntry[]> {
  try {
    const service = await createServiceClient()
    const { data, error } = await service
      .from("coach_students")
      .select(`
        id,
        student_user_id,
        sport,
        started_at,
        is_active,
        profiles!coach_students_student_user_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq("coach_user_id", coachUserId)
      .eq("club_id", clubId)
      .order("started_at", { ascending: false })

    if (error || !data) return []

    type RawRow = {
      id: string
      student_user_id: string
      sport: string
      started_at: string
      is_active: boolean
      profiles: Array<{ full_name: string | null; avatar_url: string | null }>
    }

    return (data as unknown as RawRow[]).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      return {
        id: row.id,
        studentUserId: row.student_user_id,
        fullName: (profile as { full_name: string | null } | null)?.full_name ?? null,
        avatarUrl: (profile as { avatar_url: string | null } | null)?.avatar_url ?? null,
        sport: row.sport,
        startedAt: row.started_at,
        isActive: row.is_active,
      }
    })
  } catch {
    return []
  }
}

export async function getCoachEarnings(
  coachUserId: string,
  clubId: string
): Promise<EarningEntry[]> {
  try {
    const service = await createServiceClient()
    const { data, error } = await service
      .from("coach_earnings")
      .select("id, amount, description, date, created_at")
      .eq("coach_user_id", coachUserId)
      .eq("club_id", clubId)
      .order("date", { ascending: false })

    if (error || !data) return []

    return data as EarningEntry[]
  } catch {
    return []
  }
}

export async function getCoachEarningsSummary(
  coachUserId: string,
  clubId: string
): Promise<EarningsSummary> {
  try {
    const [earnings, students] = await Promise.all([
      getCoachEarnings(coachUserId, clubId),
      getCoachStudents(coachUserId, clubId),
    ])

    const now = new Date()
    const thisMonth = now.getFullYear() * 100 + now.getMonth()

    const totalThisMonth = earnings
      .filter((e) => {
        const d = new Date(e.date)
        return d.getFullYear() * 100 + d.getMonth() === thisMonth
      })
      .reduce((sum, e) => sum + e.amount, 0)

    const totalAllTime = earnings.reduce((sum, e) => sum + e.amount, 0)

    return {
      totalThisMonth,
      totalAllTime,
      studentsCount: students.length,
    }
  } catch {
    return { totalThisMonth: 0, totalAllTime: 0, studentsCount: 0 }
  }
}
