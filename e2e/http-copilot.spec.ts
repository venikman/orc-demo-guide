import { test, expect } from "@playwright/test"
import { waitForCopilotResponse } from "./support/copilot.ts"

test.describe("Copilot over plain HTTP", () => {
  test("submits via POST, shows pending state, and renders the completed response", async ({
    page,
  }) => {
    const requests: Array<{ query?: string; threadId?: string }> = []
    page.on('request', req => {
      if (req.url().includes('/api/copilot') && req.method() === 'POST') {
        try { requests.push(req.postDataJSON()) } catch {}
      }
    })

    await page.goto("/")

    await page.getByTestId("custom-input").fill("What insurance does patient-0001 have?")
    await page.getByTestId("send-button").click()

    await expect(page.getByTestId("pending-state")).toBeVisible()
    await expect(page.getByTestId("query-display")).toHaveText(
      "What insurance does patient-0001 have?",
    )
    await expect(page.getByTestId("chat-composer")).toBeVisible()

    await waitForCopilotResponse(page)

    await expect(page.getByTestId("agent-badge")).toHaveAttribute("data-agent")
    const content = page.getByTestId("response-content")
    await expect(content).toBeVisible()
    const text = await content.textContent()
    expect(text?.length).toBeGreaterThan(0)

    await expect(page.getByTestId("inspector-panel")).not.toBeVisible()

    await page.getByTestId("inspector-toggle").click()
    await expect(page.getByTestId("inspector-panel")).toBeVisible()
    await expect(page.getByTestId("tools-used")).toBeVisible()
    await expect(page.getByTestId("reasoning")).toBeVisible()
    await expect(page.getByTestId("citations")).toBeVisible()

    expect(requests).toHaveLength(1)
  })

  test("reuses threadId between requests until reset", async ({ page }) => {
    const requests: Array<{ query?: string; threadId?: string }> = []
    page.on('request', req => {
      if (req.url().includes('/api/copilot') && req.method() === 'POST') {
        try { requests.push(req.postDataJSON()) } catch {}
      }
    })

    await page.goto("/")

    await page.getByTestId("custom-input").fill("First question")
    await page.getByTestId("send-button").click()
    await waitForCopilotResponse(page)
    const firstContent = page.getByTestId("response-content")
    await expect(firstContent).toBeVisible()
    const firstText = await firstContent.textContent()
    expect(firstText?.length).toBeGreaterThan(0)

    await page.getByTestId("custom-input").fill("Follow-up question")
    await page.getByTestId("send-button").click()
    await waitForCopilotResponse(page)
    const secondContent = page.getByTestId("response-content")
    await expect(secondContent).toBeVisible()
    const secondText = await secondContent.textContent()
    expect(secondText?.length).toBeGreaterThan(0)

    const threadIds = requests.map((request) => request.threadId ?? "")
    expect(threadIds).toHaveLength(2)
    expect(threadIds[0]).toBeTruthy()
    expect(threadIds[0]).toBe(threadIds[1])

    await page.getByTestId("reset-button").click()

    await page.getByTestId("custom-input").fill("Fresh thread")
    await page.getByTestId("send-button").click()
    await waitForCopilotResponse(page)
    const thirdContent = page.getByTestId("response-content")
    await expect(thirdContent).toBeVisible()
    const thirdText = await thirdContent.textContent()
    expect(thirdText?.length).toBeGreaterThan(0)

    const updatedThreadIds = requests.map((request) => request.threadId ?? "")
    expect(updatedThreadIds).toHaveLength(3)
    expect(updatedThreadIds[2]).toBeTruthy()
    expect(updatedThreadIds[2]).not.toBe(updatedThreadIds[0])
  })
})
