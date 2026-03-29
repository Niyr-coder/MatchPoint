import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { createServiceClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { ClubSettingsForm } from "@/components/club/ClubSettingsForm"
import type { Club } from "@/types"

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner"] })

  const service = await createServiceClient()
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
    </div>
  )
}
