import { createBrowserClient } from "@supabase/ssr"

let client: ReturnType<typeof createBrowserClient> | null = null

// Derive the cookie domain so the PKCE code verifier is accessible from both
// the www subdomain and the apex domain (e.g. www.matchpoint.top AND
// matchpoint.top). Without this, initiating OAuth from one subdomain and
// receiving the callback on another causes "code verifier not found".
//
// Priority: NEXT_PUBLIC_COOKIE_DOMAIN > hostname from NEXT_PUBLIC_SITE_URL > none
// "localhost" / loopback addresses are excluded — browsers reject domain=localhost.
function getCookieDomain(): string | undefined {
  if (process.env.NEXT_PUBLIC_COOKIE_DOMAIN) {
    return process.env.NEXT_PUBLIC_COOKIE_DOMAIN
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const { hostname } = new URL(process.env.NEXT_PUBLIC_SITE_URL)
    if (hostname !== "localhost" && !hostname.startsWith("127.")) {
      return hostname
    }
  }
  return undefined
}

export function createClient() {
  if (!client) {
    const cookieDomain = getCookieDomain()
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      cookieDomain ? { cookieOptions: { domain: cookieDomain } } : undefined
    )
  }
  return client
}
