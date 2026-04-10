import { authorizeOrRedirect } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { AccountForm } from "@/features/users/components/AccountForm"
import type { Profile, PickleballProfile } from "@/types"

function getDisplayName(profile: Profile & { username?: string | null }): string {
  return (
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "Jugador"
  )
}

function getInitial(profile: Profile & { username?: string | null }): string {
  const name = getDisplayName(profile)
  return name.charAt(0).toUpperCase()
}

export default async function UserAccountPage() {
  const ctx = await authorizeOrRedirect()

  const supabase = createServiceClient()

  // Fetch both profile and pickleball profile in parallel
  const [{ data: profileData }, { data: pickleballData }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", ctx.userId).single(),
    supabase.from("pickleball_profiles").select("*").eq("user_id", ctx.userId).maybeSingle(),
  ])

  const profile = profileData as Profile & { username?: string | null }
  const pickleballProfile = (pickleballData ?? null) as PickleballProfile | null
  const displayName = getDisplayName(profile)
  const initial = getInitial(profile)

  // Email comes from the AuthContext profile, but it lives on the auth user.
  // We surface the email stored in the profile row; if absent fall back to empty.
  const email = (profile as Profile & { email?: string | null }).email ?? ""

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="MI CUENTA"
        title="Cuenta"
        description="Gestiona tu información personal"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: profile summary card ── */}
        <div className="col-span-1">
          <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6 flex flex-col items-center gap-4 text-center">
            {/* Avatar */}
            <div className="size-20 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
              <span className="text-2xl font-black text-white">{initial}</span>
            </div>

            {/* Name & username */}
            <div>
              <p className="text-xl font-black text-[#0a0a0a]">{displayName}</p>
              {profile.username && (
                <p className="text-sm text-zinc-400 mt-0.5">@{profile.username}</p>
              )}
            </div>

            {/* Info rows */}
            <div className="w-full flex flex-col gap-3 pt-2 border-t border-[#e5e5e5]">
              {email && (
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-0.5">
                    Email
                  </p>
                  <p className="text-sm font-semibold text-[#0a0a0a] break-all">{email}</p>
                </div>
              )}
              {profile.phone && (
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-0.5">
                    Teléfono
                  </p>
                  <p className="text-sm font-semibold text-[#0a0a0a]">{profile.phone}</p>
                </div>
              )}
              {(profile.city || profile.province) && (
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-0.5">
                    Ubicación
                  </p>
                  <p className="text-sm font-semibold text-[#0a0a0a]">
                    {[profile.city, profile.province].filter(Boolean).join(", ")}
                  </p>
                </div>
              )}
            </div>

            {/* Photo button (coming soon) */}
            <button
              type="button"
              disabled
              title="Próximamente"
              className="w-full border border-[#e5e5e5] rounded-full py-2 text-[11px] font-black uppercase tracking-[0.15em] text-zinc-400 cursor-not-allowed opacity-50"
            >
              Editar foto
            </button>
          </div>
        </div>

        {/* ── Right: edit form (col-span-2) ── */}
        <div className="col-span-1 lg:col-span-2">
          <AccountForm profile={profile} email={email} pickleballProfile={pickleballProfile} />
        </div>
      </div>
    </div>
  )
}
