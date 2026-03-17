import { test, expect } from "@playwright/test"

test.describe("Reset Flow", () => {
  test("reset returns to idle", async ({ page }) => {
    await page.goto("/")

    // Start a scenario and wait for completion
    await page.getByTestId("scenario-member-insurance").click()
    await expect(page.getByTestId("agent-badge")).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByTestId("confidence-badge")).toBeVisible({
      timeout: 120_000,
    })

    // Click Clear
    await page.getByTestId("reset-button").click()

    // Idle state should be restored, response should be gone
    await expect(page.getByTestId("idle-message")).toBeVisible()
    await expect(page.getByTestId("response-content")).not.toBeVisible()
  })

  test("sequential queries work", async ({ page }) => {
    await page.goto("/")

    // First scenario — lookup agent
    await page.getByTestId("scenario-member-insurance").click()
    await expect(page.getByTestId("agent-badge")).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByTestId("confidence-badge")).toBeVisible({
      timeout: 120_000,
    })

    // Reset
    await page.getByTestId("reset-button").click()
    await expect(page.getByTestId("idle-message")).toBeVisible()

    // Second scenario — analytics agent
    await page.getByTestId("scenario-quality-practitioners").click()
    await expect(page.getByTestId("query-display")).toBeVisible()

    const agentBadge = page.getByTestId("agent-badge")
    await expect(agentBadge).toBeVisible({ timeout: 30_000 })
    await expect(agentBadge).toHaveAttribute("data-agent", "analytics")

    await expect(page.getByTestId("confidence-badge")).toBeVisible({
      timeout: 120_000,
    })

    const content = page.getByTestId("response-content")
    await expect(content).toBeVisible()
    const text = await content.textContent()
    expect(text?.length).toBeGreaterThan(0)
  })
})
