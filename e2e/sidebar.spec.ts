import { test, expect } from "@playwright/test";
import { waitForResponse } from "./support/helpers.ts";

test.describe("Scenario Sidebar", () => {
  test("workflow expand/collapse keeps only the prompt list in the rail", async ({ page }) => {
    await page.goto("/");

    const sidebar = page.getByTestId("workflow-rail");
    const header = sidebar.getByRole("button", { name: "Utilization & Costs" });
    await expect(header).toBeVisible();

    await expect(sidebar.getByTestId("scenario-util-encounters")).not.toBeVisible();
    await expect(
      sidebar.getByRole("button", { name: "Tell me about patient James Smith" }),
    ).not.toBeVisible();
    await expect(sidebar.getByText("Quick asks", { exact: false })).not.toBeVisible();
    await expect(sidebar.getByText("Track care costs", { exact: false })).not.toBeVisible();
    await expect(sidebar.getByText("Limits", { exact: false })).not.toBeVisible();

    await header.click();
    await expect(sidebar.getByTestId("scenario-util-encounters")).toBeVisible();
    await expect(
      sidebar.getByRole("button", { name: "Tell me about patient James Smith" }),
    ).not.toBeVisible();
    await expect(sidebar.getByText("Quick asks", { exact: false })).not.toBeVisible();
    await expect(sidebar.getByText("Track care costs", { exact: false })).not.toBeVisible();
    await expect(sidebar.getByText("Limits", { exact: false })).not.toBeVisible();

    await header.click();
    await expect(sidebar.getByTestId("scenario-util-encounters")).not.toBeVisible();
  });

  test("scenario prompt sends query", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Utilization & Costs" }).click();
    await page.getByTestId("scenario-util-encounters").click();

    await waitForResponse(page);

    await expect(page.getByTestId("query-display")).toHaveText("All encounters for James Smith");
  });

  test("workflow limits move to the first chat section instead of the rail", async ({ page }) => {
    await page.goto("/");

    const sidebar = page.getByTestId("workflow-rail");
    await sidebar.getByRole("button", { name: "Utilization & Costs" }).click();
    await sidebar.getByTestId("scenario-util-encounters").click();

    await waitForResponse(page);

    await expect(
      sidebar.getByText("No Claim/ExplanationOfBenefit resources", { exact: false }),
    ).not.toBeVisible();
    await expect(page.getByTestId("workflow-brief")).toContainText("Utilization & Costs");
    await expect(page.getByTestId("workflow-brief")).toContainText(
      "No Claim/ExplanationOfBenefit resources",
    );
    await expect(page.getByTestId("workflow-brief")).toContainText("No ServiceRequest resources");
  });

  test("sidebar disabled during pending request", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Membership & Attribution" }).click();
    const scenarioBtn = page.getByTestId("scenario-member-insurance");
    await expect(scenarioBtn).toBeEnabled();

    await scenarioBtn.click();

    // The button may be disabled only momentarily when the backend responds fast,
    // so verify the full lifecycle: click → response → re-enabled.
    await waitForResponse(page);

    await expect(page.getByTestId("confidence-badge")).toBeVisible();
    await expect(scenarioBtn).toBeEnabled();
    await expect(page.getByTestId("custom-input")).toBeVisible();
    await expect(page.getByTestId("send-button")).toBeVisible();
    await expect(page.getByTestId("chat-composer")).toBeVisible();
    await expect(page.getByTestId("custom-input")).toBeEnabled();
  });

  test("partial badge visible on workflows with gaps", async ({ page }) => {
    await page.goto("/");

    // Scope to the sidebar to avoid matching main area badges
    const sidebar = page.getByTestId("workflow-rail");

    // Workflows with gaps should show "partial" badge in the sidebar
    const partialBadges = sidebar.getByText("partial", { exact: true });
    await expect(partialBadges).toHaveCount(4);

    // Verify the four workflows with gaps have the badge
    for (const label of [
      "Quality & Performance",
      "Utilization & Costs",
      "Membership & Attribution",
      "Reconciliation & Export",
    ]) {
      const header = sidebar.getByRole("button", { name: label });
      await expect(header.getByText("partial")).toBeVisible();
    }

    // Workflows without gaps should not have the badge
    for (const label of ["Care Gaps", "Patient History & Continuity"]) {
      const header = sidebar.getByRole("button", { name: label });
      await expect(header.getByText("partial")).not.toBeVisible();
    }
  });

  test("workflow header controls stay inside the sidebar rail", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1400 });
    await page.goto("/");

    const sidebar = page.getByTestId("workflow-rail");
    const workflowHeader = sidebar.getByRole("button", { name: "Quality & Performance" });
    const actionChip = workflowHeader.getByText("Open", { exact: true });

    const railBox = await sidebar.boundingBox();
    const chipBox = await actionChip.boundingBox();

    expect(railBox).not.toBeNull();
    expect(chipBox).not.toBeNull();
    expect(chipBox!.x + chipBox!.width).toBeLessThanOrEqual(railBox!.x + railBox!.width - 8);
  });

  test("collapsed workflow rows stay compact in the rail", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto("/");

    const sidebar = page.getByTestId("workflow-rail");
    const firstCard = sidebar.getByTestId("workflow-card-care-gaps");
    const secondCard = sidebar.getByTestId("workflow-card-quality");

    const [firstCardBox, secondCardBox] = await Promise.all([
      firstCard.boundingBox(),
      secondCard.boundingBox(),
    ]);

    expect(firstCardBox).not.toBeNull();
    expect(secondCardBox).not.toBeNull();
    expect(firstCardBox!.height).toBeLessThanOrEqual(76);
    expect(secondCardBox!.height).toBeLessThanOrEqual(76);
  });

  test("workflow action chips keep a stable anchor point across cards", async ({ page }) => {
    await page.setViewportSize({ width: 560, height: 1400 });
    await page.goto("/");

    const sidebar = page.getByTestId("workflow-rail");
    const firstCard = sidebar.getByTestId("workflow-card-care-gaps");
    const wrappedCard = sidebar.getByTestId("workflow-card-membership");

    const firstChip = sidebar.getByTestId("workflow-toggle-care-gaps");
    const wrappedChip = sidebar.getByTestId("workflow-toggle-membership");

    const [firstCardBox, wrappedCardBox, firstChipBox, wrappedChipBox] = await Promise.all([
      firstCard.boundingBox(),
      wrappedCard.boundingBox(),
      firstChip.boundingBox(),
      wrappedChip.boundingBox(),
    ]);

    expect(firstCardBox).not.toBeNull();
    expect(wrappedCardBox).not.toBeNull();
    expect(firstChipBox).not.toBeNull();
    expect(wrappedChipBox).not.toBeNull();

    const firstOffset = {
      x: firstChipBox!.x - firstCardBox!.x,
      y: firstChipBox!.y - firstCardBox!.y,
    };
    const wrappedOffset = {
      x: wrappedChipBox!.x - wrappedCardBox!.x,
      y: wrappedChipBox!.y - wrappedCardBox!.y,
    };

    expect(Math.abs(firstOffset.x - wrappedOffset.x)).toBeLessThanOrEqual(6);
    expect(Math.abs(firstOffset.y - wrappedOffset.y)).toBeLessThanOrEqual(6);
  });
});
