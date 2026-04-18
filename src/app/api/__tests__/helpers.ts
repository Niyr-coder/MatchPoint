/**
 * Pure test utilities for API route handler tests.
 * No vi.mock() here — mocks belong in each test file to avoid hoisting conflicts.
 */
import { vi } from "vitest"
import { NextRequest } from "next/server"
import type { AppRole, AppPermission, AuthContext } from "@/features/auth/types"
import type { Profile } from "@/features/users/types"

// ---------------------------------------------------------------------------
// AuthContext factory
// ---------------------------------------------------------------------------

const STUB_PROFILE = {
  id: "user-stub-id",
  username: "testuser",
  full_name: "Test User",
  email: "test@example.com",
  avatar_url: null,
  bio: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as unknown as Profile

export function makeAuthContext(
  role: AppRole,
  overrides: Partial<AuthContext> = {}
): AuthContext {
  return {
    userId: "user-stub-id",
    profile: STUB_PROFILE,
    globalRole: role,
    clubId: null,
    clubRole: null,
    permissions: permissionsForRole(role),
    badges: [],
    ...overrides,
  }
}

function permissionsForRole(role: AppRole): AppPermission[] {
  const base: AppPermission[] = ["leaderboard.view", "chat.use", "shop.purchase", "reviews.create"]
  switch (role) {
    case "admin":
      return [
        "platform.manage", "platform.view_analytics", "club.create", "club.edit",
        "club.delete", "club.view", "club.suspend", "users.create", "users.edit",
        "users.view", "users.suspend", "tournaments.create", "tournaments.manage",
        "tournaments.view", "reports.view_full", "finance.view_full", "finance.export",
        "config.edit", "courts.create", "courts.edit", "courts.view", "schedules.manage",
        "reservations.create", "reservations.cancel", "reservations.view",
        "reservations.checkin", "team.manage", "coaches.create", "coaches.manage", ...base,
      ]
    case "owner":
      return [
        "club.edit", "club.view", "users.create", "users.edit", "users.view",
        "tournaments.create", "tournaments.manage", "tournaments.view",
        "reports.view_full", "finance.view_full", "finance.export",
        "courts.create", "courts.edit", "courts.view", "schedules.manage",
        "reservations.create", "reservations.cancel", "reservations.view",
        "reservations.checkin", "team.manage", "coaches.create", "coaches.manage",
        "config.edit", ...base,
      ]
    case "manager":
      return [
        "club.view", "users.edit", "users.view", "tournaments.manage", "tournaments.view",
        "reports.view_limited", "finance.view_limited", "courts.edit", "courts.view",
        "schedules.manage", "reservations.create", "reservations.cancel",
        "reservations.view", "reservations.checkin", ...base,
      ]
    case "coach":
      return ["tournaments.view", "courts.view", "reservations.view", "reports.view_limited", ...base]
    case "employee":
      return [
        "reservations.create", "reservations.view", "reservations.checkin",
        "finance.cashier", "courts.view", ...base,
      ]
    case "partner":
      return ["finance.view_limited", "courts.view", "reservations.view", ...base]
    default:
      return base
  }
}

// ---------------------------------------------------------------------------
// NextRequest factory
// ---------------------------------------------------------------------------

export function makeRequest(
  path: string,
  opts: { method?: string; body?: unknown; searchParams?: Record<string, string> } = {}
): NextRequest {
  const url = new URL(`http://localhost${path}`)
  if (opts.searchParams) {
    for (const [k, v] of Object.entries(opts.searchParams)) url.searchParams.set(k, v)
  }
  return new NextRequest(url.toString(), {
    method: opts.method ?? "GET",
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    headers: opts.body ? { "content-type": "application/json" } : undefined,
  })
}

// ---------------------------------------------------------------------------
// Supabase chain factory
// ---------------------------------------------------------------------------

export function makeDbChain(data: unknown = [], error: unknown = null) {
  const chain: Record<string, unknown> = {}
  for (const m of [
    "select", "insert", "update", "delete", "upsert", "eq", "neq", "in",
    "order", "limit", "range", "ilike", "or", "filter", "not", "is",
  ]) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  const single = Array.isArray(data) ? (data[0] ?? null) : data
  chain.single = vi.fn().mockResolvedValue({ data: single, error })
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: single, error })
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data, error }).then(resolve)
  return chain
}

export function makeSupabaseClient(opts: { user?: { id: string } | null; data?: unknown } = {}) {
  const { user = { id: "user-stub-id" }, data = [] } = opts
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn().mockReturnValue(makeDbChain(data)),
    storage: {
      from: vi.fn().mockReturnValue({ upload: vi.fn(), getPublicUrl: vi.fn() }),
    },
  }
}
