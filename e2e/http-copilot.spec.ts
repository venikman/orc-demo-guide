import { test, expect } from "@playwright/test"
import { mockCopilotApi } from "./support/copilot.ts"

test.describe("Copilot over plain HTTP", () => {
  test("submits via POST, shows pending state, and renders the completed response", async ({
    page,
  }) => {
    const { requests } = await mockCopilotApi(page, { delayMs: 100 })

    await page.goto("/")

    await page.getByTestId("custom-input").fill("What insurance does patient-0001 have?")
    await page.getByTestId("send-button").click()

    await expect(page.getByTestId("pending-state")).toBeVisible()
    await expect(page.getByTestId("query-display")).toHaveText(
      "What insurance does patient-0001 have?",
    )
    await expect(page.getByTestId("chat-composer")).toBeVisible()

    await expect(page.getByTestId("agent-badge")).toHaveAttribute("data-agent", "lookup")
    await expect(page.getByTestId("response-content")).toContainText(
      "Final answer for What insurance does patient-0001 have?",
    )
    await expect(page.getByTestId("inspector-panel")).not.toBeVisible()

    await page.getByTestId("inspector-toggle").click()
    await expect(page.getByTestId("inspector-panel")).toBeVisible()
    await expect(page.getByTestId("tools-used")).toContainText("fhir_read_resource")
    await expect(page.getByTestId("reasoning")).toBeVisible()
    await expect(page.getByTestId("citations")).toBeVisible()

    expect(requests).toHaveLength(1)
  })

  test("reuses threadId between requests until reset", async ({ page }) => {
    const { requests } = await mockCopilotApi(page, {
      response: (query) => ({
        answer: `Answer for ${query}`,
        agentUsed: "lookup",
        citations: [],
        confidence: "medium",
        reasoning: [],
        toolsUsed: [],
      }),
    })

    await page.goto("/")

    await page.getByTestId("custom-input").fill("First question")
    await page.getByTestId("send-button").click()
    await expect(page.getByTestId("response-content")).toContainText("Answer for First question")

    await page.getByTestId("custom-input").fill("Follow-up question")
    await page.getByTestId("send-button").click()
    await expect(page.getByTestId("response-content")).toContainText(
      "Answer for Follow-up question",
    )

    const threadIds = requests.map((request) => request.threadId ?? "")
    expect(threadIds).toHaveLength(2)
    expect(threadIds[0]).toBeTruthy()
    expect(threadIds[0]).toBe(threadIds[1])

    await page.getByTestId("reset-button").click()

    await page.getByTestId("custom-input").fill("Fresh thread")
    await page.getByTestId("send-button").click()
    await expect(page.getByTestId("response-content")).toContainText("Answer for Fresh thread")

    const updatedThreadIds = requests.map((request) => request.threadId ?? "")
    expect(updatedThreadIds).toHaveLength(3)
    expect(updatedThreadIds[2]).toBeTruthy()
    expect(updatedThreadIds[2]).not.toBe(updatedThreadIds[0])
  })
})
