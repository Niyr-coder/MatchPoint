import { authorizeOrRedirect } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { User, Phone, Calendar, MapPin, Star } from "lucide-react"

function getInitials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

const SPORT_LABELS: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

async function getCoachSports(coachUserId: string, clubId: string): Promise<string[]> {
  try {
    const service = createServiceClient()
    const { data, error } = await service
      .from("coach_students")
      .select("sport")
      .eq("coach_user_id", coachUserId)
      .eq("club_id", clubId)
      .eq("is_active", true)

    if (error || !data) return []

    const unique = new Set((data as Array<{ sport: string }>).map((r) => r.sport))
    return Array.from(unique)
  } catch {
    return []
  }
}

export default async function CoachProfilePage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["coach"] })

  const profile = ctx.profile
  const sports = await getCoachSports(ctx.userId, clubId)

  const fields = [
    {
      icon: <User className="size-4 text-zinc-400" />,
      label: "Usuario",
      value: profile.username ? `@${profile.username}` : "—",
    },
    {
      icon: <Phone className="size-4 text-zinc-400" />,
      label: "Teléfono",
      value: profile.phone ?? "—",
    },
    {
      icon: <Calendar className="size-4 text-zinc-400" />,
      label: "Fecha de nacimiento",
      value: formatDate(profile.date_of_birth),
    },
    {
      icon: <MapPin className="size-4 text-zinc-400" />,
      label: "Ciudad",
      value: [profile.city, profile.province].filter(Boolean).join(", ") || "—",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader label="Entrenador · Perfil" title="Mi Perfil" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar card */}
        <div className="rounded-2xl bg-card border border-border p-6 flex flex-col items-center gap-4">
          <div className="size-24 rounded-full bg-muted text-zinc-500 font-black text-2xl flex items-center justify-center">
            {getInitials(profile.full_name)}
          </div>
          <div className="text-center">
            <p className="text-base font-black text-foreground">
              {profile.full_name ?? "Sin nombre"}
            </p>
            {profile.username && (
              <p className="text-[11px] text-zinc-400 mt-0.5">@{profile.username}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-100">
            <Star className="size-3 text-amber-500 fill-amber-500" />
            <span className="text-[11px] font-black text-amber-600 uppercase tracking-wide">
              Entrenador
            </span>
          </div>
          {sports.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center">
              {sports.map((s) => (
                <span
                  key={s}
                  className="text-[10px] font-black px-2 py-0.5 rounded-full bg-muted text-zinc-500 uppercase tracking-wide"
                >
                  {SPORT_LABELS[s] ?? s}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Info card */}
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-6 flex flex-col gap-4">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
            Información Personal
          </p>
          <div className="divide-y divide-border-subtle">
            {fields.map((f) => (
              <div key={f.label} className="flex items-center justify-between py-3 gap-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  {f.icon}
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide shrink-0">
                    {f.label}
                  </span>
                </div>
                <span className="text-sm font-medium text-foreground text-right truncate">
                  {f.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
