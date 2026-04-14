import { authorizeOrRedirect } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { AdminReservationsView } from "@/components/admin/AdminReservationsView"
import type { ReservationAdmin } from "@/app/api/admin/reservations/route"

async function getReservations(): Promise<ReservationAdmin[]> {
  try {
    const supabase = createServiceClient()

    // profiles table has no email column — fetch emails from auth.users via admin API
    const [reservationsResult, usersResult] = await Promise.all([
      supabase
        .from("reservations")
        .select(
          `
          id,
          user_id,
          date,
          start_time,
          end_time,
          status,
          total_price,
          notes,
          created_at,
          profiles:user_id (
            full_name
          ),
          courts:court_id (
            id,
            name,
            sport,
            club_id,
            clubs:club_id (
              id,
              name
            )
          )
          `
        )
        .order("date", { ascending: false })
        .order("start_time", { ascending: false })
        .limit(200),
      supabase.auth.admin.listUsers({ perPage: 1000 }),
    ])

    if (reservationsResult.error) throw new Error(reservationsResult.error.message)

    // Build email lookup map from auth.users
    const emailMap = new Map<string, string>(
      (usersResult.data?.users ?? []).map((u) => [u.id, u.email ?? ""])
    )

    return (reservationsResult.data ?? []).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      const court   = Array.isArray(row.courts)   ? row.courts[0]   : row.courts
      const club    = court
        ? Array.isArray((court as { clubs?: unknown }).clubs)
          ? ((court as { clubs?: unknown[] }).clubs ?? [])[0]
          : (court as { clubs?: unknown }).clubs
        : null

      return {
        id:          row.id as string,
        user_id:     row.user_id as string,
        user_name:   (profile as { full_name?: string | null } | null)?.full_name ?? null,
        user_email:  emailMap.get(row.user_id as string) ?? null,
        club_id:     (club   as { id?: string }   | null)?.id   ?? null,
        club_name:   (club   as { name?: string } | null)?.name ?? null,
        court_id:    (court  as { id?: string }   | null)?.id   ?? "",
        court_name:  (court  as { name?: string } | null)?.name ?? null,
        court_sport: (court  as { sport?: string }| null)?.sport ?? null,
        date:        row.date        as string,
        start_time:  row.start_time  as string,
        end_time:    row.end_time    as string,
        status:      row.status      as "pending" | "confirmed" | "cancelled",
        total_price: row.total_price as number,
        notes:       row.notes       as string | null,
        created_at:  row.created_at  as string,
      }
    })
  } catch {
    return []
  }
}

async function getClubs(): Promise<Array<{ id: string; name: string }>> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("clubs")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []) as Array<{ id: string; name: string }>
  } catch {
    return []
  }
}

export default async function AdminReservationsPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  const [reservations, clubs] = await Promise.all([getReservations(), getClubs()])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="Gestión Global"
        title="Reservas"
        description="Todas las reservas de canchas en la plataforma."
        action={
          <span className="text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full border bg-muted text-zinc-500 border-zinc-200">
            {reservations.length} cargadas
          </span>
        }
      />
      <AdminReservationsView reservations={reservations} clubs={clubs} />
    </div>
  )
}
