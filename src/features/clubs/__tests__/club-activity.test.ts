import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}))

import { getClubActivity } from "../club-activity"

// Helper: builds a Supabase chainable query builder stub
function makeQueryBuilder(resolvedData: unknown) {
  const builder: Record<string, unknown> = {}
  const chainMethods = ["select", "in", "eq", "order", "limit"]
  for (const m of chainMethods) {
    builder[m] = vi.fn().mockReturnValue(builder)
  }
  builder["limit"] = vi.fn().mockResolvedValue({ data: resolvedData, error: null })
  return builder
}

describe("getClubActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns empty array when user has no club roles", async () => {
    // First from() call is for user_roles
    const rolesBuilder = makeQueryBuilder([])
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(rolesBuilder),
    })

    const result = await getClubActivity("user-1")
    expect(result).toEqual([])
  })

  it("returns merged activity items sorted by timestamp desc", async () => {
    const rolesBuilder = makeQueryBuilder([{ club_id: "club-1" }])
    const tournamentsBuilder = makeQueryBuilder([
      {
        id: "t-1",
        name: "Torneo Pádel",
        created_at: "2026-04-17T10:00:00Z",
        clubs: { name: "Club Norte" },
      },
    ])
    const membersBuilder = makeQueryBuilder([
      {
        id: "m-1",
        created_at: "2026-04-17T12:00:00Z",
        clubs: { name: "Club Norte" },
        profiles: { full_name: "Ana López" },
      },
    ])

    let callCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) return rolesBuilder
        if (callCount === 2) return tournamentsBuilder
        return membersBuilder
      }),
    })

    const result = await getClubActivity("user-1")

    expect(result).toHaveLength(2)
    // member joined later → appears first
    expect(result[0].type).toBe("new_member")
    expect(result[0].title).toBe("Ana López se unió al club")
    expect(result[1].type).toBe("tournament_opened")
    expect(result[1].title).toBe('Torneo "Torneo Pádel" abierto')
  })

  it("returns at most 5 items", async () => {
    const rolesBuilder = makeQueryBuilder([{ club_id: "club-1" }])

    const manyTournaments = Array.from({ length: 4 }, (_, i) => ({
      id: `t-${i}`,
      name: `Torneo ${i}`,
      created_at: `2026-04-1${i}T10:00:00Z`,
      clubs: { name: "Club" },
    }))
    const manyMembers = Array.from({ length: 4 }, (_, i) => ({
      id: `m-${i}`,
      created_at: `2026-04-1${i}T12:00:00Z`,
      clubs: { name: "Club" },
      profiles: { full_name: `Member ${i}` },
    }))

    const tournamentsBuilder = makeQueryBuilder(manyTournaments)
    const membersBuilder = makeQueryBuilder(manyMembers)

    let callCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) return rolesBuilder
        if (callCount === 2) return tournamentsBuilder
        return membersBuilder
      }),
    })

    const result = await getClubActivity("user-1")
    expect(result.length).toBeLessThanOrEqual(5)
  })
})
