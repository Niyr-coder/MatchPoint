import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// ──────────────────────────────────────────────────────────
// Route classification
// ──────────────────────────────────────────────────────────

/** Paths that require an authenticated session. Unauthenticated requests are
 *  redirected to /login with a ?next= param so the user lands back after auth. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/club",
  "/onboarding",
  "/context-selector",
] as const

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

// ──────────────────────────────────────────────────────────
// Proxy (Next.js 16 — replaces middleware.ts)
// ──────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  // Start with a pass-through response so we have an object to attach
  // refreshed session cookies to before returning.
  // NOTE: Do not add any code between createServerClient and
  // supabase.auth.getUser() — the Supabase SSR client depends on that
  // call being the first async operation after construction.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 1. Mirror updated cookies onto the request so downstream Server
          //    Components read the refreshed session on the same request cycle.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // 2. Recreate the response with the mutated request so Next.js
          //    forwards the new cookies to the browser.
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              // Keep cookie attributes consistent with server.ts:
              // 365-day lifetime and optional apex-domain sharing on matchpoint.top
              maxAge: 60 * 60 * 24 * 365,
              ...(process.env.COOKIE_DOMAIN
                ? { domain: process.env.COOKIE_DOMAIN }
                : {}),
            })
          )
        },
      },
    }
  )

  // getUser() triggers a server-side token refresh when the access token has
  // expired. The updated tokens are written to supabaseResponse via setAll.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (isProtected(pathname) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    // Preserve the intended destination so the auth callback can redirect back
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // IMPORTANT: always return supabaseResponse (not a fresh NextResponse.next())
  // so the refreshed session cookies propagate to the browser.
  return supabaseResponse
}

// ──────────────────────────────────────────────────────────
// Matcher
// ──────────────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Run on all paths except:
     * - _next/static   — compiled assets served by Next.js
     * - _next/image    — image optimisation endpoint
     * - favicon.ico    — browser favicon
     * - Static files   — svg, png, jpg, jpeg, gif, webp
     * - api/auth/callback — OAuth code-exchange route; must reach its handler
     *                       uninterrupted (no active session at that point)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/auth/callback).*)",
  ],
}
