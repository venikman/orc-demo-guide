import { test, expect, type Page } from "@playwright/test";
import { workflows } from "../src/client/scenarios.ts";
import { waitForResponse } from "./support/helpers.ts";

async function expandWorkflow(page: Page, scenarioId: string) {
  const wf = workflows.find((w) => w.scenarios.some((s) => s.id === scenarioId));
  if (!wf) throw new Error(`Unknown scenario ${scenarioId}`);
  await page.getByRole("button", { name: wf.label }).click();
}

// One representative scenario per agent type to verify routing
const agentScenarios = [
  { id: "member-insurance", agent: "lookup" },
  { id: "util-encounters", agent: "search" },
  { id: "quality-practitioners", agent: "analytics" },
  { id: "clinical-summary", agent: "clinical" },
  { id: "gaps-metformin", agent: "cohort" },
  { id: "recon-export", agent: "export" },
] as const;

// All clickable scenario buttons across all workflows
test.describe("Copilot Agent Validator", () => {
  test("page loads with all scenario buttons and a visible center composer", async ({ page }) => {
    await page.goto("/");

    const workflowLabels = [
      "Care Gaps",
      "Quality & Performance",
      "Utilization & Costs",
      "Membership & Attribution",
      "Patient History & Continuity",
      "Reconciliation & Export",
    ] as const;

    for (const label of workflowLabels) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }

    for (const workflow of workflows) {
      await page.getByRole("button", { name: workflow.label }).click();

      for (const scenario of workflow.scenarios) {
        await expect(page.getByTestId(`scenario-${scenario.id}`)).toBeVisible();
      }
    }

    await expect(page.getByTestId("custom-input")).toBeVisible();
    await expect(page.getByTestId("send-button")).toBeVisible();
    await expect(page.getByTestId("chat-composer")).toBeVisible();
    await expect(page.getByTestId("idle-message")).toBeVisible();
    await expect(page.getByTestId("workflow-rail").getByTestId("custom-input")).toHaveCount(0);
  });

  for (const scenario of agentScenarios) {
    test(`${scenario.agent} agent — routes correctly via ${scenario.id}`, async ({ page }) => {
      await page.goto("/");

      await expandWorkflow(page, scenario.id);
      await page.getByTestId(`scenario-${scenario.id}`).click();

      await waitForResponse(page);

      await expect(page.getByTestId("query-display")).toBeVisible();

      const agentBadge = page.getByTestId("agent-badge");
      await expect(agentBadge).toBeVisible();
      await expect(agentBadge).toHaveAttribute("data-agent");

      await expect(page.getByTestId("confidence-badge")).toBeVisible();

      const content = page.getByTestId("response-content");
      await expect(content).toBeVisible();
      const text = await content.textContent();
      expect(text?.length).toBeGreaterThan(0);

      await expect(page.getByTestId("inspector-panel")).not.toBeVisible();
    });
  }

  test("custom query — submit and receive response", async ({ page }) => {
    await page.goto("/");

    const input = page.getByTestId("custom-input");
    await input.fill("How many patients are in the system?");
    await page.getByTestId("send-button").click();

    await expect(page.getByTestId("query-display")).toHaveText(
      "How many patients are in the system?",
    );

    await waitForResponse(page);

    await expect(page.getByTestId("agent-badge")).toBeVisible();
    await expect(page.getByTestId("confidence-badge")).toBeVisible();
    await expect(page.getByTestId("response-content")).toBeVisible();
  });

  test("pending behavior — request shows a loading panel before completion", async ({ page }) => {
    await page.goto("/");

    await expandWorkflow(page, "clinical-summary");
    await page.getByTestId("scenario-clinical-summary").click();

    await expect(page.getByTestId("pending-state")).toBeVisible();
    await waitForResponse(page);
    await expect(page.getByTestId("confidence-badge")).toBeVisible();
  });
});
