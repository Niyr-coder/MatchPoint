import { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import { SITE_NAME } from "@/lib/constants"
import { InviteRedeemClient } from "@/features/memberships/components/InviteRedeemClient"
import type { InviteEntityType } from "@/features/memberships/actions"

// ──────────────────────────────────────────────────────────────────────────────
// Metadata
// ──────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: `Invitación — ${SITE_NAME}`,
  description: "Acepta tu invitación y únete a MATCHPOINT.",
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const ENTITY_LABELS: Record<InviteEntityType, string> = {
  club:        "Invitación al Club",
  tournament:  "Invitación al Torneo",
  team:        "Invitación al Equipo",
  event:       "Invitación al Evento",
  coach_class: "Invitación a la Clase",
  reservation: "Invitación a la Reserva",
}

const ENTITY_DESCRIPTIONS: Record<InviteEntityType, string> = {
  club:        "Has sido invitado a unirte a un club deportivo en MATCHPOINT.",
  tournament:  "Has sido invitado a participar en un torneo.",
  team:        "Has sido invitado a unirte a un equipo.",
  event:       "Has sido invitado a registrarte en un evento.",
  coach_class: "Has sido invitado a unirte a una clase con un entrenador.",
  reservation: "Has sido invitado a una reserva de cancha.",
}

// ──────────────────────────────────────────────────────────────────────────────
// Attempt to resolve invite metadata via service client (no auth required)
// Returns null if the code is not found or any error occurs — we degrade
// gracefully rather than throwing so the page still renders.
// ──────────────────────────────────────────────────────────────────────────────

interface InvitePreview {
  entity_type: InviteEntityType
  is_active: boolean
  expires_at: string | null
}

async function getInvitePreview(code: string): Promise<InvitePreview | null> {
  try {
    // Use the anon client — RLS on invite_links should allow public reads by code
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("invite_links")
      .select("entity_type, is_active, expires_at")
      .eq("code", code)
      .maybeSingle()

    if (error || !data) return null

    return data as InvitePreview
  } catch {
    return null
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Auth check — runs on the server with the user's session cookies
// ──────────────────────────────────────────────────────────────────────────────

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params

  const [preview, userId] = await Promise.all([
    getInvitePreview(code),
    getAuthenticatedUserId(),
  ])

  const isAuthenticated = userId !== null

  // Determine labels from preview or use generic fallback
  const entityType = preview?.entity_type ?? null
  const title = entityType ? ENTITY_LABELS[entityType] : "Invitación a MATCHPOINT"
  const description = entityType
    ? ENTITY_DESCRIPTIONS[entityType]
    : "Has recibido una invitación para unirte a MATCHPOINT."

  // Detect early terminal states (expired / inactive) before rendering CTA
  const isExpired =
    preview?.expires_at != null &&
    new Date(preview.expires_at) < new Date()

  const isInactive = preview !== null && !preview.is_active

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
      {/* Card */}
      <div className="w-full max-w-md rounded-2xl border border-[#e5e5e5] bg-white shadow-sm p-8 flex flex-col items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 font-black text-xl tracking-tight text-[#0a0a0a]">
          <span className="text-[#16a34a]">●</span>
          {SITE_NAME}
        </Link>

        {/* Divider */}
        <div className="w-full h-px bg-[#e5e5e5]" />

        {/* Invite info */}
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            {SITE_NAME}
          </p>
          <h1 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#0a0a0a] leading-tight">
            {title}
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
            {description}
          </p>
        </div>

        {/* CTA area — delegated to Client Component for interactivity */}
        <div className="w-full">
          <InviteRedeemClient
            code={code}
            isAuthenticated={isAuthenticated}
            isExpired={isExpired}
            isInactive={isInactive}
            entityType={entityType}
          />
        </div>

        {/* Terms note */}
        {isAuthenticated && !isExpired && !isInactive && (
          <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
            Al unirte aceptas los{" "}
            <a href="#" className="underline hover:text-zinc-600 transition-colors">
              Términos de Servicio
            </a>{" "}
            de {SITE_NAME}.
          </p>
        )}
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-zinc-400">
        © {new Date().getFullYear()} {SITE_NAME}
      </p>
    </div>
  )
}
