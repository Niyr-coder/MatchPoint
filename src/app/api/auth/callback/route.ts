import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRoles } from "@/features/memberships/queries"
import { getPostLoginDestination } from "@/features/auth/helpers"
import type { AppRole, Profile } from "@/types"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const reason = encodeURIComponent(error.message ?? error.code ?? "unknown")
    return NextResponse.redirect(`${origin}/login?error=exchange_failed&reason=${reason}`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no_user`)
  }

  // Check if the profile exists and onboarding is complete
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile || !(profile as Profile).onboarding_completed) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  const globalRole: AppRole =
    ((profile as Profile & { global_role: AppRole }).global_role) ?? "user"

  const roles = await getUserRoles(user.id)
  const destination = getPostLoginDestination(profile as Profile, globalRole, roles)

  // Respect explicit `next` param only for safe same-origin paths
  const redirectTo = next.startsWith("/") && next !== "/" ? next : destination

  return NextResponse.redirect(`${origin}${redirectTo}`)
}
