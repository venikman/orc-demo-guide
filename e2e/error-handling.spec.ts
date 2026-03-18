import { test, expect } from "@playwright/test"
import { mockCopilotApi } from "./support/copilot.ts"

test.describe("Error handling", () => {
  test("error state displays on HTTP failure", async ({ page }) => {
    await mockCopilotApi(page, { status: 500 })
    await page.goto("/")

    const input = page.getByTestId("custom-input")
    await input.fill("test query")
    await page.getByTestId("send-button").click()

    const errorMessage = page.getByTestId("error-message")
    await expect(errorMessage).toBeVisible()

    const text = await errorMessage.textContent()
    expect(text?.length).toBeGreaterThan(0)
  })

  test("error state shows Clear button", async ({ page }) => {
    await mockCopilotApi(page, { status: 500 })
    await page.goto("/")

    const input = page.getByTestId("custom-input")
    await input.fill("test query")
    await page.getByTestId("send-button").click()

    await expect(page.getByTestId("error-message")).toBeVisible()

    await expect(page.getByTestId("reset-button")).toBeVisible()
  })
})
