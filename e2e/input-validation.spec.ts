import { test, expect } from "@playwright/test"

test.describe("Input Validation", () => {
  test("send button disabled when input empty", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByTestId("send-button")).toBeDisabled()
  })

  test("send button disabled with whitespace-only input", async ({ page }) => {
    await page.goto("/")

    await page.getByTestId("custom-input").fill("   ")

    await expect(page.getByTestId("send-button")).toBeDisabled()
  })

  test("send button enabled with valid input", async ({ page }) => {
    await page.goto("/")

    await page.getByTestId("custom-input").fill("test query")

    await expect(page.getByTestId("send-button")).toBeEnabled()
  })

  test("Enter key submits query", async ({ page }) => {
    await page.goto("/")

    await page.getByTestId("custom-input").fill("How many patients?")
    await page.getByTestId("custom-input").press("Enter")

    await expect(page.getByTestId("query-display")).toHaveText(
      "How many patients?",
    )
    await expect(page.getByTestId("idle-message")).not.toBeVisible()
  })

  test("input clears after submit", async ({ page }) => {
    await page.goto("/")

    await page.getByTestId("custom-input").fill("How many patients?")
    await page.getByTestId("custom-input").press("Enter")

    await expect(page.getByTestId("custom-input")).toHaveValue("")
  })
})
