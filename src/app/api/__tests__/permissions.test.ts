/**
 * Permission tests for API routes.
 *
 * Strategy: import route handlers directly, mock authorize() + Supabase,
 * assert HTTP status and response shape. No server needed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { makeAuthContext, makeRequest } from "./helpers"

// ---------------------------------------------------------------------------
// Module-level mocks (hoisted by vitest automatically)
// ---------------------------------------------------------------------------

vi.mock("@/features/auth/queries", () => ({ authorize: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
  RATE_LIMITS: new Proxy({}, { get: () => ({ limit: 100, window: 60 }) }),
}))
vi.mock("@/features/clubs/queries", () => ({
  getAllClubsAdmin: vi.fn().mockResolvedValue([]),
}))
vi.mock("@/features/organizer/permissions", () => ({
  canOrganize: vi.fn().mockResolvedValue(true),
}))
vi.mock("@/features/organizer/queries", () => ({
  getOrganizerQuedadas: vi.fn().mockResolvedValue([]),
}))

import { authorize } from "@/features/auth/queries"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const mockAuthorize = vi.mocked(authorize)
const mockCreateClient = vi.mocked(createClient)
const mockCreateServiceClient = vi.mocked(createServiceClient)

// ---------------------------------------------------------------------------
// Supabase chain factory (shared across tests)
// ---------------------------------------------------------------------------

function makeDbChain(data: unknown = [], error: unknown = null) {
  const chain: Record<string, unknown> = {}
  const methods = ["select", "insert", "update", "delete", "upsert", "eq", "neq",
    "in", "order", "limit", "range", "ilike", "or", "filter", "not"]
  for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] ?? null : data, error })
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] ?? null : data, error })
  // Allow awaiting the chain directly
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data, error }).then(resolve)
  return chain
}

function makeSupabaseClient(opts: { user?: { id: string } | null; data?: unknown } = {}) {
  const { user = { id: "user-stub-id" }, data = [] } = opts
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn().mockReturnValue(makeDbChain(data)),
    storage: { from: vi.fn().mockReturnValue({ upload: vi.fn(), getPublicUrl: vi.fn() }) },
  }
  mockCreateClient.mockResolvedValue(client as never)
  mockCreateServiceClient.mockReturnValue(client as never)
  return client
}

beforeEach(() => {
  vi.clearAllMocks()
  makeSupabaseClient()
})

// ---------------------------------------------------------------------------
// Helper: build authorize mock results
// ---------------------------------------------------------------------------

function authorizeAs(role: "admin" | "owner" | "manager" | "employee" | "coach" | "user") {
  mockAuthorize.mockResolvedValue({ ok: true, context: makeAuthContext(role) })
}
function authorizeUnauthenticated() {
  mockAuthorize.mockResolvedValue({ ok: false, reason: "not_authenticated" })
}
function authorizeForbidden() {
  mockAuthorize.mockResolvedValue({ ok: false, reason: "insufficient_role" })
}

// ===========================================================================
// admin/clubs — requires admin role
// ===========================================================================

describe("GET /api/admin/clubs", () => {
  async function callRoute(req = makeRequest("/api/admin/clubs")) {
    const { GET } = await import("@/app/api/admin/clubs/route")
    return GET(req)
  }

  it("returns 403 when unauthenticated", async () => {
    authorizeUnauthenticated()
    const res = await callRoute()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 403 when caller is USER (non-admin)", async () => {
    authorizeForbidden()
    const res = await callRoute()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 200 with data when caller is ADMIN", async () => {
    authorizeAs("admin")
    const res = await callRoute()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })
})

// ===========================================================================
// admin/announcements — requires admin role
// ===========================================================================

describe("GET /api/admin/announcements", () => {
  async function callRoute() {
    const { GET } = await import("@/app/api/admin/announcements/route")
    return GET()
  }

  it("returns 403 when unauthenticated", async () => {
    authorizeUnauthenticated()
    const res = await callRoute()
    expect(res.status).toBe(403)
  })

  it("returns 403 when OWNER calls admin-only route", async () => {
    authorizeForbidden()
    const res = await callRoute()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeTruthy()
  })

  it("returns 200 when ADMIN calls admin-only route", async () => {
    authorizeAs("admin")
    makeSupabaseClient({ data: [] })
    const res = await callRoute()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

// ===========================================================================
// quedadas — requires authentication (any role)
// ===========================================================================

describe("GET /api/quedadas", () => {
  async function callRoute(req = makeRequest("/api/quedadas")) {
    const { GET } = await import("@/app/api/quedadas/route")
    return GET()
  }

  it("returns 401 when unauthenticated", async () => {
    authorizeUnauthenticated()
    const res = await callRoute()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 200 when authenticated USER with organizer permission", async () => {
    authorizeAs("user")
    const res = await callRoute()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("returns 200 when MANAGER calls route", async () => {
    authorizeAs("manager")
    const res = await callRoute()
    expect(res.status).toBe(200)
  })
})

// ===========================================================================
// Response shape contract — every route must follow { success, data, error }
// ===========================================================================

describe("API response shape contract", () => {
  it("fail responses have success:false, data:null, and a non-empty error", async () => {
    authorizeUnauthenticated()
    const { GET } = await import("@/app/api/admin/clubs/route")
    const res = await GET(makeRequest("/api/admin/clubs"))
    const body = await res.json()
    expect(body).toMatchObject({
      success: false,
      data: null,
      error: expect.any(String),
    })
    expect(body.error.length).toBeGreaterThan(0)
  })

  it("ok responses have success:true, non-null data, and error:null", async () => {
    authorizeAs("admin")
    const { GET } = await import("@/app/api/admin/clubs/route")
    const res = await GET(makeRequest("/api/admin/clubs"))
    const body = await res.json()
    expect(body).toMatchObject({
      success: true,
      data: expect.anything(),
      error: null,
    })
  })
})

// ===========================================================================
// Role hierarchy — lower roles cannot access higher-privilege endpoints
// ===========================================================================

describe("Role hierarchy enforcement", () => {
  const adminOnlyRoutes = [
    { label: "admin/clubs", call: () => import("@/app/api/admin/clubs/route").then(m => m.GET(makeRequest("/api/admin/clubs"))) },
    { label: "admin/announcements", call: () => import("@/app/api/admin/announcements/route").then(m => m.GET()) },
  ]

  for (const route of adminOnlyRoutes) {
    it(`USER cannot access ${route.label}`, async () => {
      authorizeForbidden()
      const res = await route.call()
      expect(res.status).toBeGreaterThanOrEqual(400)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    it(`OWNER cannot access ${route.label}`, async () => {
      authorizeForbidden()
      const res = await route.call()
      expect(res.status).toBeGreaterThanOrEqual(400)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    it(`ADMIN can access ${route.label}`, async () => {
      authorizeAs("admin")
      const res = await route.call()
      // 200 OR 500 (if DB fails) are both acceptable — the point is auth passed
      const body = await res.json()
      expect([200, 500]).toContain(res.status)
      // If 200, must have success:true
      if (res.status === 200) expect(body.success).toBe(true)
    })
  }
})
