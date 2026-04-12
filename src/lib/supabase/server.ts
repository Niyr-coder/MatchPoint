import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// Fail fast at startup if required env vars are missing
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_URL")
if (!SUPABASE_ANON_KEY) throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_ANON_KEY")
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing env var: SUPABASE_SERVICE_ROLE_KEY")

// Resolve cookie domain with same logic as the browser client so all auth
// cookies (session + PKCE verifier) share the same domain and are accessible
// across www and apex (e.g. www.matchpoint.top and matchpoint.top).
function getCookieDomain(): string | undefined {
  if (process.env.COOKIE_DOMAIN) return process.env.COOKIE_DOMAIN
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const { hostname } = new URL(process.env.NEXT_PUBLIC_SITE_URL)
    if (hostname !== "localhost" && !hostname.startsWith("127.")) {
      return hostname
    }
  }
  return undefined
}

export async function createClient() {
  const cookieStore = await cookies()
  const cookieDomain = getCookieDomain()

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
                ...(cookieDomain ? { domain: cookieDomain } : {}),
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
