import { authorizeOrRedirect } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { AdminReservationsView } from "@/components/admin/AdminReservationsView"
import type { ReservationAdmin } from "@/app/api/admin/reservations/route"
import type { ApiResponse } from "@/types"

async function getReservations(): Promise<ReservationAdmin[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const res = await fetch(`${baseUrl}/api/admin/reservations?page=1`, {
      cache: "no-store",
    })
    const json: ApiResponse<ReservationAdmin[]> = await res.json()
    if (!json.success || !json.data) return []
    return json.data
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
          <span className="text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full border bg-zinc-100 text-zinc-500 border-zinc-200">
            {reservations.length} cargadas
          </span>
        }
      />
      <AdminReservationsView reservations={reservations} clubs={clubs} />
    </div>
  )
}
