import { authorizeOrRedirect } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { ClubSettingsForm } from "@/features/clubs/components/ClubSettingsForm"
import { InviteLinkGenerator } from "@/features/memberships/components/InviteLinkGenerator"
import type { Club } from "@/types"

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner"] })

  const service = createServiceClient()
  const { data: club } = await service
    .from("clubs")
    .select("*")
    .eq("id", clubId)
    .single()

  if (!club) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader label="Configuración" title="Ajustes del Club" />
        <p className="text-sm text-zinc-500">Club no encontrado.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader label="Configuración" title="Ajustes del Club" />
      <ClubSettingsForm club={club as Club} clubId={clubId} />

      {/* Invite link section */}
      <div className="rounded-2xl bg-card border border-border p-6 flex flex-col gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">
            Invitaciones
          </p>
          <h3 className="text-sm font-black text-foreground mt-0.5">
            Link de invitación al club
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Comparte este link para que usuarios se unan directamente a tu club.
          </p>
        </div>
        <InviteLinkGenerator entityType="club" entityId={clubId} />
      </div>
    </div>
  )
}
