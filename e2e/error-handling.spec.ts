import { test, expect } from "@playwright/test"

test.describe("Error handling", () => {
  test("error state displays on WS failure", async ({ page }) => {
    // Override WebSocket so that any connection fires an error immediately
    await page.addInitScript(() => {
      const OriginalWebSocket = window.WebSocket
      // @ts-expect-error -- overriding global for test
      window.WebSocket = function (url: string, protocols?: string | string[]) {
        const ws = new OriginalWebSocket(url, protocols)
        // Force-close before the connection can open
        setTimeout(() => ws.close(), 0)
        return ws
      } as unknown as typeof WebSocket
      Object.assign(window.WebSocket, OriginalWebSocket)
      window.WebSocket.prototype = OriginalWebSocket.prototype
    })

    await page.goto("/")

    // Submit a query so the app attempts a WebSocket connection
    const input = page.getByTestId("custom-input")
    await input.fill("test query")
    await page.getByTestId("send-button").click()

    // The error message element should become visible
    const errorMessage = page.getByTestId("error-message")
    await expect(errorMessage).toBeVisible({ timeout: 10_000 })

    // It should contain text describing the problem
    const text = await errorMessage.textContent()
    expect(text?.length).toBeGreaterThan(0)
  })

  test("error state shows Clear button", async ({ page }) => {
    await page.addInitScript(() => {
      const OriginalWebSocket = window.WebSocket
      // @ts-expect-error -- overriding global for test
      window.WebSocket = function (url: string, protocols?: string | string[]) {
        const ws = new OriginalWebSocket(url, protocols)
        setTimeout(() => ws.close(), 0)
        return ws
      } as unknown as typeof WebSocket
      Object.assign(window.WebSocket, OriginalWebSocket)
      window.WebSocket.prototype = OriginalWebSocket.prototype
    })

    await page.goto("/")

    const input = page.getByTestId("custom-input")
    await input.fill("test query")
    await page.getByTestId("send-button").click()

    // Wait for the error state to appear
    await expect(page.getByTestId("error-message")).toBeVisible({
      timeout: 10_000,
    })

    // The reset/clear button should also be visible
    await expect(page.getByTestId("reset-button")).toBeVisible()
  })
})
