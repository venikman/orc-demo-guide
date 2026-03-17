import { test, expect } from "@playwright/test"

test.describe("Post-Response Panels", () => {
  test("reasoning panel renders after completion", async ({ page }) => {
    await page.goto("/")

    await page.getByTestId("scenario-clinical-summary").click()

    // Wait for agent badge (meta message arrived)
    await expect(page.getByTestId("agent-badge")).toBeVisible({
      timeout: 30_000,
    })

    // Wait for response to complete
    await expect(page.getByTestId("confidence-badge")).toBeVisible({
      timeout: 120_000,
    })

    // Reasoning panel should be visible with at least one step
    const reasoning = page.getByTestId("reasoning")
    await expect(reasoning).toBeVisible()
    await expect(reasoning.locator("ol > li").first()).toBeVisible()
  })

  test("citations list renders after completion", async ({ page }) => {
    await page.goto("/")

    await page.getByTestId("scenario-member-insurance").click()

    // Wait for agent badge (meta message arrived)
    await expect(page.getByTestId("agent-badge")).toBeVisible({
      timeout: 30_000,
    })

    // Wait for response to complete
    await expect(page.getByTestId("confidence-badge")).toBeVisible({
      timeout: 120_000,
    })

    // Citations list should be visible with at least one citation
    const citations = page.getByTestId("citations")
    await expect(citations).toBeVisible()
    await expect(citations.locator("ul > li").first()).toBeVisible()
  })

  test("both panels render in grid layout", async ({ page }) => {
    await page.goto("/")

    await page.getByTestId("scenario-clinical-summary").click()

    // Wait for agent badge (meta message arrived)
    await expect(page.getByTestId("agent-badge")).toBeVisible({
      timeout: 30_000,
    })

    // Wait for response to complete
    await expect(page.getByTestId("confidence-badge")).toBeVisible({
      timeout: 120_000,
    })

    // Both panels should be visible simultaneously
    await expect(page.getByTestId("reasoning")).toBeVisible()
    await expect(page.getByTestId("citations")).toBeVisible()
  })
})
