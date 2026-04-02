import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

// Routes that never require auth
const PUBLIC_PATHS = ["/", "/login", "/onboarding"]
const PUBLIC_PREFIXES = [
  "/api/waitlist",
  "/api/auth",
  "/_next",
  "/images",
  "/favicon",
]

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always run through Supabase cookie management so the PKCE code verifier
  // and session tokens are forwarded correctly on every request — including
  // public paths like /api/auth/callback.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          // Step 1: update request cookies so subsequent reads are consistent
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Step 2: recreate response with updated request, then forward cookies
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — mandatory for PKCE flow; do not remove.
  const { data: { user } } = await supabase.auth.getUser()

  if (isPublic(pathname)) return supabaseResponse

  if (!user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const proxyConfig = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/).*)",
  ],
}
