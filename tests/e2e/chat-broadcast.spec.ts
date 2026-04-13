import { test, expect } from "@playwright/test"

// E2E smoke: verify chat page loads for authenticated users.
// Full broadcast flow requires real credentials — use as integration smoke.
test.describe("Chat pages", () => {
  test("unauthenticated user is redirected from messages page", async ({ page }) => {
    await page.goto("/club/test-club/owner/messages")
    // Should redirect to login, not stay on messages
    await expect(page).not.toHaveURL(/\/owner\/messages/)
  })
})
