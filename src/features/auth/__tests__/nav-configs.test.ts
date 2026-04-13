import { describe, it, expect } from "vitest"
import {
  getAdminNav,
  getOwnerNav,
  getManagerNav,
  getCoachNav,
  getPartnerNav,
  getEmployeeNav,
  getUserNav,
} from "@/lib/navigation/nav-configs"

const CLUB_ID = "test-club-123"

describe("nav-configs", () => {
  it("all nav functions return non-empty sections", () => {
    const configs = [
      getAdminNav(),
      getOwnerNav(CLUB_ID),
      getManagerNav(CLUB_ID),
      getCoachNav(CLUB_ID),
      getPartnerNav(CLUB_ID),
      getEmployeeNav(CLUB_ID),
      getUserNav(),
    ]
    for (const sections of configs) {
      expect(sections.length).toBeGreaterThan(0)
      for (const section of sections) {
        expect(section.items.length).toBeGreaterThan(0)
      }
    }
  })

  it("all sections have a title", () => {
    const configs = [
      getPartnerNav(CLUB_ID),
      getEmployeeNav(CLUB_ID),
    ]
    for (const sections of configs) {
      for (const section of sections) {
        expect(section.title, "section must have title").toBeTruthy()
      }
    }
  })

  it("getUserNav has no emoji in labels", () => {
    const sections = getUserNav()
    for (const section of sections) {
      for (const item of section.items) {
        expect(item.label).not.toMatch(/[\u{1F600}-\u{1F9FF}]/u)
      }
    }
  })

  it("club nav hrefs include clubId", () => {
    const sections = getOwnerNav(CLUB_ID)
    const hrefs = sections.flatMap((s) => s.items.map((i) => i.href))
    expect(hrefs.every((h) => h.includes(CLUB_ID))).toBe(true)
  })
})
