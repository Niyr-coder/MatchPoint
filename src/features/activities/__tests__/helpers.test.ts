import { describe, it, expect } from "vitest"
import { orgInitials, attendeeColor } from "../lib/helpers"

describe("orgInitials", () => {
  it("returns single uppercase letter for single-word name", () => {
    expect(orgInitials("Carlos")).toBe("C")
  })
  it("returns first+last initials for multi-word name", () => {
    expect(orgInitials("Club Deportivo Pichincha")).toBe("CP")
  })
  it("handles extra whitespace", () => {
    expect(orgInitials("  Juan  Pérez  ")).toBe("JP")
  })
  it("returns empty string for empty input", () => {
    expect(orgInitials("")).toBe("")
  })
})

describe("attendeeColor", () => {
  it("returns an object with bg and text strings", () => {
    const color = attendeeColor("user-123")
    expect(color).toHaveProperty("bg")
    expect(color).toHaveProperty("text")
    expect(typeof color.bg).toBe("string")
    expect(typeof color.text).toBe("string")
  })
  it("returns the same color for the same userId", () => {
    expect(attendeeColor("abc")).toEqual(attendeeColor("abc"))
  })
  it("returns a color within the palette for any userId", () => {
    const colors = [attendeeColor("a"), attendeeColor("b"), attendeeColor("z")]
    colors.forEach((c) => {
      expect(c.bg).toMatch(/^#[0-9a-f]{6}$/i)
      expect(c.text).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })
})
