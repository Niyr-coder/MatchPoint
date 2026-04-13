import { describe, it, expect } from "vitest"
import { ok, fail } from "@/lib/api/response"

describe("ok()", () => {
  it("returns success envelope", async () => {
    const res = ok({ id: "1" })
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual({ id: "1" })
    expect(body.error).toBeNull()
  })
})

describe("fail()", () => {
  it("returns error envelope with 400 by default", async () => {
    const res = fail("Bad input")
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.data).toBeNull()
    expect(body.error).toBe("Bad input")
  })

  it("respects custom status code", async () => {
    const res = fail("Not found", 404)
    expect(res.status).toBe(404)
  })
})
