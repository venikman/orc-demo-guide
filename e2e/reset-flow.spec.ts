import { test, expect } from "@playwright/test";
import { waitForResponse } from "./support/helpers.ts";

test.describe("Reset Flow", () => {
  test("reset returns to idle", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Membership & Attribution" }).click();
    await page.getByTestId("scenario-member-insurance").click();
    await waitForResponse(page);
    await expect(page.getByTestId("agent-badge")).toBeVisible();
    await expect(page.getByTestId("confidence-badge")).toBeVisible();

    await page.getByTestId("reset-button").click();

    await expect(page.getByTestId("idle-message")).toBeVisible();
    await expect(page.getByTestId("response-content")).not.toBeVisible();
  });

  test("sequential queries work", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Membership & Attribution" }).click();
    await page.getByTestId("scenario-member-insurance").click();
    await waitForResponse(page);
    await expect(page.getByTestId("agent-badge")).toBeVisible();
    await expect(page.getByTestId("confidence-badge")).toBeVisible();

    await page.getByTestId("reset-button").click();
    await expect(page.getByTestId("idle-message")).toBeVisible();

    await page.getByRole("button", { name: "Quality & Performance" }).click();
    await page.getByTestId("scenario-quality-practitioners").click();
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
  });
});
