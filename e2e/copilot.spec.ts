import { test, expect } from "@playwright/test"
import { expandWorkflowForScenario, mockCopilotApi } from "./support/copilot.ts"
import { workflows } from "../src/client/scenarios.ts"

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
test.describe("Copilot Agent Validator", () => {
  test("page loads with all scenario buttons and a visible center composer", async ({
    page,
  }) => {
    await mockCopilotApi(page)
    await page.goto("/")

    const workflowLabels = [
      "Care Gaps",
      "Quality & Performance",
      "Utilization & Costs",
      "Membership & Attribution",
      "Patient History & Continuity",
      "Reconciliation & Export",
    ] as const

    for (const label of workflowLabels) {
      await expect(page.getByRole("button", { name: label })).toBeVisible()
    }

    for (const workflow of workflows) {
      await page.getByRole("button", { name: workflow.label }).click()

      for (const scenario of workflow.scenarios) {
        await expect(page.getByTestId(`scenario-${scenario.id}`)).toBeVisible()
      }
    }

    await expect(page.getByTestId("custom-input")).toBeVisible()
    await expect(page.getByTestId("send-button")).toBeVisible()
    await expect(page.getByTestId("chat-composer")).toBeVisible()
    await expect(page.getByTestId("idle-message")).toBeVisible()
    await expect(page.getByTestId("workflow-rail").getByTestId("custom-input")).toHaveCount(0)
  })

  for (const scenario of agentScenarios) {
    test(`${scenario.agent} agent — routes correctly via ${scenario.id}`, async ({
      page,
    }) => {
      await mockCopilotApi(page)
      await page.goto("/")

      await expandWorkflowForScenario(page, scenario.id)
      await page.getByTestId(`scenario-${scenario.id}`).click()

      await expect(page.getByTestId("query-display")).toBeVisible()

      const agentBadge = page.getByTestId("agent-badge")
      await expect(agentBadge).toBeVisible()
      await expect(agentBadge).toHaveAttribute("data-agent", scenario.agent)

      await expect(page.getByTestId("confidence-badge")).toBeVisible()

      const content = page.getByTestId("response-content")
      await expect(content).toBeVisible()
      const text = await content.textContent()
      expect(text?.length).toBeGreaterThan(0)

      await expect(page.getByTestId("inspector-panel")).not.toBeVisible()
    })
  }

  test("custom query — submit and receive response", async ({ page }) => {
    await mockCopilotApi(page)
    await page.goto("/")

    const input = page.getByTestId("custom-input")
    await input.fill("How many patients are in the system?")
    await page.getByTestId("send-button").click()

    await expect(page.getByTestId("query-display")).toHaveText(
      "How many patients are in the system?",
    )

    await expect(page.getByTestId("agent-badge")).toBeVisible()
    await expect(page.getByTestId("confidence-badge")).toBeVisible()
    await expect(page.getByTestId("response-content")).toBeVisible()
  })

  test("desktop layout gives the chat canvas more width", async ({ page }) => {
    await mockCopilotApi(page)
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.goto("/")

    await expandWorkflowForScenario(page, "util-encounters")
    await page.getByTestId("scenario-util-encounters").click()

    const stageBox = await page.getByTestId("chat-stage").boundingBox()
    expect(stageBox).not.toBeNull()
    expect(stageBox!.width).toBeGreaterThan(1000)
  })

  test("small screens keep the composer reachable without horizontal page scroll", async ({
    page,
  }) => {
    await mockCopilotApi(page)
    await page.setViewportSize({ width: 540, height: 900 })
    await page.goto("/")

    await expect(page.getByTestId("custom-input")).toBeVisible()
    await expect(page.getByTestId("send-button")).toBeVisible()

    const composerBox = await page.getByTestId("chat-composer").boundingBox()
    expect(composerBox).not.toBeNull()
    expect(composerBox!.x).toBeGreaterThanOrEqual(0)
    expect(composerBox!.x + composerBox!.width).toBeLessThanOrEqual(540)
    expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(900)

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(hasHorizontalOverflow).toBe(false)
  })

  test("desktop composer stays compact instead of becoming a tall panel", async ({
    page,
  }) => {
    await mockCopilotApi(page)
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.goto("/")

    const composerBox = await page.getByTestId("chat-composer").boundingBox()
    expect(composerBox).not.toBeNull()
    expect(composerBox!.height).toBeLessThanOrEqual(120)
  })

  test("desktop layout keeps the workflow rail compact so the chat stage stays wide", async ({
    page,
  }) => {
    await mockCopilotApi(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto("/")

    const [railBox, stageBox] = await Promise.all([
      page.getByTestId("workflow-rail").boundingBox(),
      page.getByTestId("chat-stage").boundingBox(),
    ])

    expect(railBox).not.toBeNull()
    expect(stageBox).not.toBeNull()
    expect(railBox!.width).toBeLessThanOrEqual(264)
    expect(stageBox!.width).toBeGreaterThanOrEqual(900)
  })

  test("pending behavior — request shows a loading panel before completion", async ({
    page,
  }) => {
    await mockCopilotApi(page, { delayMs: 300 })
    await page.goto("/")

    await expandWorkflowForScenario(page, "clinical-summary")
    await page.getByTestId("scenario-clinical-summary").click()

    await expect(page.getByTestId("pending-state")).toBeVisible()
    await expect(page.getByTestId("confidence-badge")).toBeVisible()
  })
})
