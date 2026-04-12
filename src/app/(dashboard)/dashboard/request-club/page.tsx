import { redirect } from "next/navigation"
import { authorizeOrRedirect } from "@/features/auth/queries"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { ClubRequestForm } from "@/features/clubs/components/ClubRequestForm"
import { Building2, Clock } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClubRequest {
  id: string
  name: string
  city: string
  province: string
  status: "pending" | "approved" | "rejected"
  admin_notes: string | null
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function PendingRequestCard({ request }: { request: ClubRequest }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">
            Tu solicitud actual
          </p>
          <h2 className="text-xl font-black text-foreground tracking-[-0.02em]">
            {request.name}
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {request.city}, {request.province}
          </p>
        </div>

        {request.status === "pending" && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-black uppercase tracking-wide shrink-0">
            <Clock className="size-3" />
            En revisión
          </span>
        )}
        {request.status === "approved" && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-[11px] font-black uppercase tracking-wide shrink-0">
            Aprobada
          </span>
        )}
        {request.status === "rejected" && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-[11px] font-black uppercase tracking-wide shrink-0">
            Rechazada
          </span>
        )}
      </div>

      <div className="border-t border-border-subtle pt-4 flex flex-col gap-1.5">
        <p className="text-xs text-zinc-400">
          Enviada el{" "}
          <span className="font-bold text-zinc-600">{formatDate(request.created_at)}</span>
        </p>

        {request.status === "pending" && (
          <p className="text-sm text-zinc-500 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mt-1">
            El equipo de MATCHPOINT revisará tu solicitud y te notificará por correo electrónico. El proceso puede tomar 1–3 días hábiles.
          </p>
        )}

        {request.status === "rejected" && request.admin_notes && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mt-1">
            <p className="font-bold text-[11px] uppercase tracking-wide mb-1">Motivo:</p>
            <p>{request.admin_notes}</p>
          </div>
        )}

        {request.status === "approved" && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3 mt-1">
            Tu club ha sido creado y ya tienes acceso como Owner. Dirígete a la sección de Clubs para comenzar a configurarlo.
          </p>
        )}
      </div>
    </div>
  )
}

function InfoBanner() {
  return (
    <div className="rounded-2xl bg-muted border border-border p-6 flex gap-4">
      <div className="size-10 rounded-xl bg-foreground flex items-center justify-center shrink-0">
        <Building2 className="size-5 text-white" />
      </div>
      <div>
        <p className="text-sm font-black text-foreground uppercase tracking-[-0.01em]">
          ¿Tienes un club deportivo en Ecuador?
        </p>
        <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
          Regístralo en MATCHPOINT y accede a herramientas de gestión de canchas, reservas, torneos, membresías y más. Una vez aprobada tu solicitud, podrás configurar tu club y comenzar a recibir reservas.
        </p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function RequestClubPage() {
  await authorizeOrRedirect()

  // Fetch the user's existing club requests directly via Supabase client
  // (RLS ensures the user can only see their own requests)
  const supabase = await createClient()
  const { data: requests } = await supabase
    .from("club_requests")
    .select("id, name, city, province, status, admin_notes, created_at")
    .order("created_at", { ascending: false })

  const existingRequests = (requests ?? []) as ClubRequest[]

  // The most recent pending request takes priority
  const pendingRequest = existingRequests.find((r) => r.status === "pending") ?? null
  // Most recent approved request (for post-approval messaging)
  const approvedRequest = existingRequests.find((r) => r.status === "approved") ?? null
  // Most recent rejected (so user can resubmit with context)
  const latestRejected = existingRequests.find((r) => r.status === "rejected") ?? null

  // Auto-redirect approved owners to setup (if club not configured) or to their panel
  if (approvedRequest) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const service = createServiceClient()
      const { data: membership } = await service
        .from("club_members")
        .select("club_id")
        .eq("user_id", user.id)
        .eq("role", "owner")
        .order("joined_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (membership) {
        const { count: courtsCount } = await service
          .from("courts")
          .select("*", { count: "exact", head: true })
          .eq("club_id", membership.club_id)
          .eq("is_active", true)

        const dest =
          (courtsCount ?? 0) === 0
            ? `/club/${membership.club_id}/owner/setup`
            : `/club/${membership.club_id}/owner`
        redirect(dest)
      }
    }
  }

  // If pending or approved — show status card, no form
  const displayRequest = pendingRequest ?? approvedRequest

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="Mi cuenta · Club"
        title="Solicitar un Club"
        description="Registra tu club deportivo en la plataforma MATCHPOINT"
      />

      <InfoBanner />

      {displayRequest ? (
        <PendingRequestCard request={displayRequest} />
      ) : (
        <>
          {/* Show context about a previous rejection */}
          {latestRejected && (
            <div className="rounded-2xl bg-card border border-border p-5">
              <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400 mb-1">
                Solicitud anterior rechazada
              </p>
              <p className="text-sm text-zinc-500">
                Tu solicitud anterior para{" "}
                <span className="font-bold text-zinc-700">{latestRejected.name}</span> fue rechazada.
                {latestRejected.admin_notes && (
                  <>
                    {" "}Motivo:{" "}
                    <span className="text-zinc-700">{latestRejected.admin_notes}</span>.
                  </>
                )}{" "}
                Puedes enviar una nueva solicitud a continuación.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">
                Formulario de solicitud
              </p>
              <p className="text-sm text-zinc-500">
                Completa los campos a continuación. El equipo de MATCHPOINT revisará tu solicitud y te contactará en 1–3 días hábiles.
              </p>
            </div>
            <ClubRequestForm />
          </div>
        </>
      )}
    </div>
  )
}
