import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}))

import { fetchJoinPreview } from "../join-preview"

function makeChain(resolvedValue: unknown) {
  const builder: Record<string, unknown> = {}
  for (const m of ["select", "eq", "in", "order", "limit", "single"]) {
    builder[m] = vi.fn().mockReturnValue(builder)
  }
  builder["maybeSingle"] = vi.fn().mockResolvedValue(resolvedValue)
  builder["single"] = vi.fn().mockResolvedValue(resolvedValue)
  return builder
}

describe("fetchJoinPreview", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns not_found when code does not exist", async () => {
    const inviteBuilder = makeChain({ data: null, error: null })
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(inviteBuilder),
    })

    const result = await fetchJoinPreview("bad-code")
    expect(result.status).toBe("not_found")
  })

  it("returns inactive status when invite is not active", async () => {
    const inviteBuilder = makeChain({
      data: {
        id: "inv-1",
        entity_type: "club",
        entity_id: "club-1",
        is_active: false,
        expires_at: null,
        uses_count: 0,
        max_uses: null,
      },
      error: null,
    })
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(inviteBuilder),
    })

    const result = await fetchJoinPreview("code-1")
    expect(result.status).toBe("inactive")
  })

  it("returns expired status when invite is past expires_at", async () => {
    const inviteBuilder = makeChain({
      data: {
        id: "inv-1",
        entity_type: "club",
        entity_id: "club-1",
        is_active: true,
        expires_at: "2020-01-01T00:00:00Z",
        uses_count: 0,
        max_uses: null,
      },
      error: null,
    })
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(inviteBuilder),
    })

    const result = await fetchJoinPreview("code-1")
    expect(result.status).toBe("expired")
  })

  it("returns exhausted when uses_count >= max_uses", async () => {
    const inviteBuilder = makeChain({
      data: {
        id: "inv-1",
        entity_type: "club",
        entity_id: "club-1",
        is_active: true,
        expires_at: null,
        uses_count: 5,
        max_uses: 5,
      },
      error: null,
    })
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(inviteBuilder),
    })

    const result = await fetchJoinPreview("code-1")
    expect(result.status).toBe("exhausted")
  })

  it("returns valid with club entity data", async () => {
    const inviteData = {
      id: "inv-1",
      entity_type: "club",
      entity_id: "club-1",
      is_active: true,
      expires_at: null,
      uses_count: 1,
      max_uses: null,
    }
    const clubData = {
      id: "club-1",
      name: "Club Quito Norte",
      city: "Quito",
      description: "Un club deportivo.",
    }

    let callCount = 0
    const inviteBuilder = makeChain({ data: inviteData, error: null })
    const clubBuilder = makeChain({ data: clubData, error: null })

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        callCount++
        return callCount === 1 ? inviteBuilder : clubBuilder
      }),
    })

    const result = await fetchJoinPreview("code-1")
    expect(result.status).toBe("valid")
    expect(result.entity.name).toBe("Club Quito Norte")
    expect(result.entity_type).toBe("club")
  })
})
