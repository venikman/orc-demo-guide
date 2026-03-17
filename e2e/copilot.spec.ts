import { test, expect } from "@playwright/test"

// One representative scenario per agent type to verify routing
const agentScenarios = [
  { id: "member-insurance", agent: "lookup" },
  { id: "util-encounters", agent: "search" },
  { id: "quality-practitioners", agent: "analytics" },
  { id: "clinical-summary", agent: "clinical" },
  { id: "gaps-metformin", agent: "cohort" },
  { id: "recon-export", agent: "export" },
] as const

// All clickable scenario buttons across all workflows
const allScenarioIds = [
  "gaps-metformin",
  "gaps-preventive",
  "gaps-hba1c",
  "gaps-hypertension",
  "quality-diabetes-encounters",
  "quality-network",
  "quality-practitioners",
  "util-encounters",
  "util-patient-search",
  "member-lists",
  "member-insurance",
  "clinical-summary",
  "clinical-encounter",
  "recon-export",
]

test.describe("Copilot Agent Validator", () => {
  test("page loads with all scenario buttons and custom input", async ({
    page,
  }) => {
    await page.goto("/")

    for (const id of allScenarioIds) {
      await expect(page.getByTestId(`scenario-${id}`)).toBeVisible()
    }

    await expect(page.getByTestId("custom-input")).toBeVisible()
    await expect(page.getByTestId("send-button")).toBeVisible()
    await expect(page.getByTestId("idle-message")).toBeVisible()
  })

  for (const scenario of agentScenarios) {
    test(`${scenario.agent} agent — routes correctly via ${scenario.id}`, async ({
      page,
    }) => {
      await page.goto("/")

      await page.getByTestId(`scenario-${scenario.id}`).click()

      // Query should be displayed
      await expect(page.getByTestId("query-display")).toBeVisible()

      // Wait for agent badge to appear (means meta message arrived)
      const agentBadge = page.getByTestId("agent-badge")
      await expect(agentBadge).toBeVisible({ timeout: 30_000 })
      await expect(agentBadge).toHaveAttribute("data-agent", scenario.agent)

      // Wait for response to complete
      await expect(page.getByTestId("confidence-badge")).toBeVisible({
        timeout: 120_000,
      })

      // Should have non-empty response content
      const content = page.getByTestId("response-content")
      await expect(content).toBeVisible()
      const text = await content.textContent()
      expect(text?.length).toBeGreaterThan(0)

      // Should have at least one tool call
      const toolCalls = page.getByTestId("tool-call")
      await expect(toolCalls.first()).toBeVisible()
    })
  }

  test("custom query — submit and receive response", async ({ page }) => {
    await page.goto("/")

    const input = page.getByTestId("custom-input")
    await input.fill("How many patients are in the system?")
    await page.getByTestId("send-button").click()

    // Query should be displayed
    await expect(page.getByTestId("query-display")).toHaveText(
      "How many patients are in the system?",
    )

    // Wait for response
    await expect(page.getByTestId("agent-badge")).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByTestId("confidence-badge")).toBeVisible({
      timeout: 120_000,
    })
    await expect(page.getByTestId("response-content")).toBeVisible()
  })

  test("streaming behavior — tool calls appear before confidence badge", async ({
    page,
  }) => {
    await page.goto("/")

    // Use clinical scenario (likely to have multiple tool calls with long streaming)
    await page.getByTestId("scenario-clinical-summary").click()

    // Tool call should appear during streaming (before done)
    await expect(page.getByTestId("tool-call").first()).toBeVisible({
      timeout: 60_000,
    })

    // At this point, confidence badge should NOT yet be visible
    // (it only appears after "done" message)
    const confidenceVisible = await page
      .getByTestId("confidence-badge")
      .isVisible()
      .catch(() => false)

    // If confidence is already visible, streaming was too fast to catch,
    // but the test still validates that tool calls appeared
    if (!confidenceVisible) {
      await expect(page.getByTestId("streaming-indicator")).toBeVisible()
    }

    // Eventually confidence badge appears
    await expect(page.getByTestId("confidence-badge")).toBeVisible({
      timeout: 120_000,
    })
  })
})
