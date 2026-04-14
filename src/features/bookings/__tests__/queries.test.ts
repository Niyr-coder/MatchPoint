import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockRpc, mockCreateClient } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockCreateClient: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}))

import { createReservation } from "../queries"

describe("createReservation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateClient.mockResolvedValue({ rpc: mockRpc })
  })

  it("calls reserve_slot RPC with correct params", async () => {
    const fakeReservation = {
      id: "res-1",
      court_id: "court-1",
      user_id: "user-1",
      date: "2026-05-01",
      start_time: "10:00:00",
      end_time: "11:00:00",
      total_price: 12,
      notes: null,
      status: "pending",
      created_at: "2026-05-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
    }
    mockRpc.mockResolvedValue({ data: [fakeReservation], error: null })

    const result = await createReservation("user-1", {
      court_id: "court-1",
      date: "2026-05-01",
      start_time: "10:00",
      end_time: "11:00",
      total_price: 12,
    })

    expect(mockRpc).toHaveBeenCalledWith("reserve_slot", {
      p_court_id:    "court-1",
      p_user_id:     "user-1",
      p_date:        "2026-05-01",
      p_start_time:  "10:00",
      p_end_time:    "11:00",
      p_total_price: 12,
      p_notes:       null,
    })
    expect(result.id).toBe("res-1")
  })

  it("throws with 'slot_conflict' message when RPC returns slot_conflict error", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "slot_conflict", code: "P0001" },
    })

    await expect(
      createReservation("user-1", {
        court_id: "court-1",
        date: "2026-05-01",
        start_time: "10:00",
        end_time: "11:00",
        total_price: 12,
      })
    ).rejects.toThrow("slot_conflict")
  })
})
