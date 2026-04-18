import { Metadata } from "next"
import { notFound } from "next/navigation"
import { fetchJoinPreview } from "@/features/memberships/join-preview"
import { JoinPageClient } from "@/features/memberships/components/JoinPageClient"
import { createClient } from "@/lib/supabase/server"
import { SITE_NAME } from "@/lib/constants"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>
}): Promise<Metadata> {
  const { code } = await params
  const preview = await fetchJoinPreview(code)
  if (preview.status === "not_found") {
    return { title: `Invitación — ${SITE_NAME}` }
  }
  return {
    title: `${preview.entity.name} — ${SITE_NAME}`,
    description: preview.entity.description ?? `Únete a ${preview.entity.name} en ${SITE_NAME}`,
  }
}

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params

  const [preview, userId] = await Promise.all([
    fetchJoinPreview(code),
    getAuthenticatedUserId(),
  ])

  if (preview.status === "not_found") notFound()

  return (
    <JoinPageClient
      preview={preview}
      isAuthenticated={userId !== null}
    />
  )
}
