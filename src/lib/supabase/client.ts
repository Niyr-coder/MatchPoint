import { createBrowserClient } from "@supabase/ssr"

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!client) {
    // Set cookie domain to match server-side configuration so the PKCE code
    // verifier cookie is accessible regardless of www vs apex domain.
    // Mirrors the COOKIE_DOMAIN env var used by the middleware and server client.
    const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? undefined

    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      cookieDomain ? { cookieOptions: { domain: cookieDomain } } : undefined
    )
  }
  return client
}
