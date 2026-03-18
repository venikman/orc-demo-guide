import { test, expect } from "@playwright/test"
import { expandWorkflowForScenario, waitForCopilotResponse } from "./support/copilot.ts"

test.describe("Reset Flow", () => {
  test("reset returns to idle", async ({ page }) => {
    await page.goto("/")

    await expandWorkflowForScenario(page, "member-insurance")
    await page.getByTestId("scenario-member-insurance").click()
    await waitForCopilotResponse(page)
    await expect(page.getByTestId("agent-badge")).toBeVisible()
    await expect(page.getByTestId("confidence-badge")).toBeVisible()

    await page.getByTestId("reset-button").click()

    await expect(page.getByTestId("idle-message")).toBeVisible()
    await expect(page.getByTestId("response-content")).not.toBeVisible()
  })

  test("sequential queries work", async ({ page }) => {
    await page.goto("/")

    await expandWorkflowForScenario(page, "member-insurance")
    await page.getByTestId("scenario-member-insurance").click()
    await waitForCopilotResponse(page)
    await expect(page.getByTestId("agent-badge")).toBeVisible()
    await expect(page.getByTestId("confidence-badge")).toBeVisible()

    await page.getByTestId("reset-button").click()
    await expect(page.getByTestId("idle-message")).toBeVisible()

    await expandWorkflowForScenario(page, "quality-practitioners")
    await page.getByTestId("scenario-quality-practitioners").click()
    await waitForCopilotResponse(page)
    await expect(page.getByTestId("query-display")).toBeVisible()

    const agentBadge = page.getByTestId("agent-badge")
    await expect(agentBadge).toBeVisible()
    await expect(agentBadge).toHaveAttribute("data-agent")

    await expect(page.getByTestId("confidence-badge")).toBeVisible()

    const content = page.getByTestId("response-content")
    await expect(content).toBeVisible()
    const text = await content.textContent()
    expect(text?.length).toBeGreaterThan(0)
  })
})
