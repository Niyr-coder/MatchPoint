import { authorizeOrRedirect } from "@/features/auth/queries"
import { getClubClients } from "@/features/clubs/queries/team"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable } from "@/components/shared/DataTable"
import { EmptyState } from "@/components/shared/EmptyState"
import { Users } from "lucide-react"
import type { ClientEntry } from "@/features/clubs/queries/team"
import type { Column } from "@/components/shared/DataTable"

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getInitials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

const columns: Column<ClientEntry & { id: string }>[] = [
  {
    key: "fullName",
    header: "Nombre",
    render: (item) => (
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-full bg-zinc-100 text-zinc-500 font-black text-xs flex items-center justify-center shrink-0">
          {getInitials(item.fullName)}
        </div>
        <span className="font-medium text-[#0a0a0a]">{item.fullName ?? "Sin nombre"}</span>
      </div>
    ),
  },
  {
    key: "phone",
    header: "Teléfono",
    render: (item) => (
      <span className="text-zinc-500">{item.phone ?? "—"}</span>
    ),
  },
  {
    key: "totalReservations",
    header: "Reservas Totales",
    render: (item) => (
      <span className="font-black text-[#0a0a0a]">{item.totalReservations}</span>
    ),
  },
  {
    key: "lastVisit",
    header: "Última Visita",
    render: (item) => (
      <span className="text-zinc-500">{formatDate(item.lastVisit)}</span>
    ),
  },
]

export default async function ClientsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["manager"] })

  const clients = await getClubClients(clubId)

  const tableData = clients.map((c) => ({ ...c, id: c.userId }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader label="Clientes" title="Clientes del Club" />

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aún no hay clientes registrados"
          description="Las visitas aparecerán aquí una vez que se realicen reservas en el club."
        />
      ) : (
        <DataTable
          columns={columns}
          data={tableData}
          keyExtractor={(item) => item.userId}
        />
      )}
    </div>
  )
}
