import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                maxAge: 60 * 60 * 24 * 365,
                ...(process.env.COOKIE_DOMAIN
                  ? { domain: process.env.COOKIE_DOMAIN }
                  : {}),
              })
            )
          } catch {
            // Server Component — cookies are read-only
          }
        },
      },
    }
  )
}

// Uses @supabase/supabase-js directly (no cookies) so the service role JWT is
// sent as the Authorization bearer token. This correctly sets role=service_role
// in PostgREST, bypassing RLS for all operations.
// Do NOT use @supabase/ssr here — passing user cookies causes the user JWT to
// override the service role, making RLS apply as `authenticated` instead.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
