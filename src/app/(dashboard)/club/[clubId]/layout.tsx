import { notFound } from "next/navigation"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function ClubLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params

  if (!UUID_REGEX.test(clubId)) {
    notFound()
  }

  return <>{children}</>
}
