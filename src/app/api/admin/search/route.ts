import { NextRequest, NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"

export interface SearchResult {
  id: string
  type: "user" | "club" | "tournament"
  title: string
  subtitle: string | null
  href: string
}

interface SearchResponse {
  results: SearchResult[]
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<{ data: SearchResponse | null; error: string | null }>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json({ data: null, error: "No autorizado" }, { status: 403 })
  }

  const ctx = authResult.context
  const rl = await checkRateLimit("adminSearch", ctx.userId, RATE_LIMITS.adminSearch)
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: "Demasiadas solicitudes. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) {
    return NextResponse.json({ data: { results: [] }, error: null })
  }

  const term = `%${q}%`
  const supabase = createServiceClient()

  const [usersRes, clubsRes, tournamentsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, username, global_role")
      .or(`full_name.ilike.${term},username.ilike.${term}`)
      .limit(5),
    supabase
      .from("clubs")
      .select("id, name, city")
      .ilike("name", term)
      .limit(5),
    supabase
      .from("tournaments")
      .select("id, name, sport, status")
      .ilike("name", term)
      .limit(5),
  ])

  const results: SearchResult[] = [
    ...(usersRes.data ?? []).map((u) => ({
      id: u.id as string,
      type: "user" as const,
      title: (u.full_name as string | null) ?? (u.username as string | null) ?? "Usuario",
      subtitle: u.username ? `@${u.username as string}` : (u.global_role as string | null),
      href: `/admin/users`,
    })),
    ...(clubsRes.data ?? []).map((c) => ({
      id: c.id as string,
      type: "club" as const,
      title: c.name as string,
      subtitle: (c.city as string | null),
      href: `/admin/clubs`,
    })),
    ...(tournamentsRes.data ?? []).map((t) => ({
      id: t.id as string,
      type: "tournament" as const,
      title: t.name as string,
      subtitle: `${t.sport as string} · ${t.status as string}`,
      href: `/admin/tournaments`,
    })),
  ]

  return NextResponse.json({ data: { results }, error: null })
}
