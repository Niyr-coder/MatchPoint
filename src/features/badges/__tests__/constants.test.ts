import { describe, it, expect } from "vitest"
import { BADGE_CONFIG, BADGE_PERMISSION_MAP, BADGE_TYPES, CLUB_BADGE_TYPES } from "../constants"

describe("BADGE_TYPES", () => {
  it("contains all 5 badge keys", () => {
    expect(BADGE_TYPES).toHaveLength(5)
    expect(BADGE_TYPES).toContain("organizador_verificado")
    expect(BADGE_TYPES).toContain("vip")
  })
})

describe("BADGE_CONFIG", () => {
  it("every badge type has emoji, label, and color", () => {
    for (const type of BADGE_TYPES) {
      expect(BADGE_CONFIG[type].emoji).toBeTruthy()
      expect(BADGE_CONFIG[type].label).toBeTruthy()
      expect(BADGE_CONFIG[type].color).toBeTruthy()
    }
  })
  it("vip is not club scoped", () => {
    expect(BADGE_CONFIG.vip.canBeClubScoped).toBe(false)
  })
})

describe("BADGE_PERMISSION_MAP", () => {
  it("organizador_verificado grants tournaments.create", () => {
    expect(BADGE_PERMISSION_MAP.organizador_verificado).toContain("tournaments.create")
  })
  it("vip grants shop.purchase", () => {
    expect(BADGE_PERMISSION_MAP.vip).toContain("shop.purchase")
  })
  it("arbitro grants reservations.checkin", () => {
    expect(BADGE_PERMISSION_MAP.arbitro).toContain("reservations.checkin")
  })
})

describe("CLUB_BADGE_TYPES", () => {
  it("excludes adminOnly badges", () => {
    expect(CLUB_BADGE_TYPES).not.toContain("vip")
    expect(CLUB_BADGE_TYPES).not.toContain("organizador_verificado")
  })
  it("includes non-adminOnly badges", () => {
    expect(CLUB_BADGE_TYPES).toContain("arbitro")
    expect(CLUB_BADGE_TYPES).toContain("embajador")
    expect(CLUB_BADGE_TYPES).toContain("capitan")
  })
})
