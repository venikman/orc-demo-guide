import { expect, type Page } from "@playwright/test"
import { workflows } from "../../src/client/scenarios.ts"

export async function waitForCopilotResponse(page: Page) {
  await expect(page.getByTestId("response-content")).toBeVisible({ timeout: 30_000 })
}

export async function expandWorkflowForScenario(page: Page, scenarioId: string) {
  const workflow = workflows.find((entry) =>
    entry.scenarios.some((scenario) => scenario.id === scenarioId),
  )

  if (!workflow) {
    throw new Error(`Unknown scenario ${scenarioId}`)
  }

  await page.getByRole("button", { name: workflow.label }).click()
}
