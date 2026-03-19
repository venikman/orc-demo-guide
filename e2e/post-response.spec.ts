import { test, expect } from "@playwright/test";
import { waitForResponse } from "./support/helpers.ts";

test.describe("Post-Response Panels", () => {
  test("response badges and inline code use the shell styling system", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Membership & Attribution" }).click();
    await page.getByTestId("scenario-member-insurance").click();

    await waitForResponse(page);

    const response = page.getByTestId("response-content");
    await expect(response).toBeVisible();
    const text = await response.textContent();
    expect(text?.length).toBeGreaterThan(0);

    const badges = response.locator('[data-slot="badge"]');
    const badgeCount = await badges.count();
    if (badgeCount > 0) {
      const badgeRadius = await badges
        .first()
        .evaluate((node) => getComputedStyle(node).borderRadius);
      expect(badgeRadius).toBe("0px");
    }
  });

  test("reasoning panel is hidden by default and opens from the inspector toggle", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Patient History & Continuity" }).click();
    await page.getByTestId("scenario-clinical-summary").click();

    await waitForResponse(page);

    const reasoning = page.getByTestId("reasoning");
    await expect(page.getByTestId("inspector-panel")).not.toBeVisible();
    await expect(reasoning).not.toBeVisible();

    await page.getByTestId("inspector-toggle").click();
    await expect(page.getByTestId("inspector-panel")).toBeVisible();
    await expect(reasoning).toBeVisible();
  });

  test("citations list renders inside the inspector only after toggling", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Membership & Attribution" }).click();
    await page.getByTestId("scenario-member-insurance").click();

    await waitForResponse(page);

    const citations = page.getByTestId("citations");
    await expect(citations).not.toBeVisible();

    await page.getByTestId("inspector-toggle").click();
    await expect(citations).toBeVisible();
  });

  test("inspector can be opened and closed without losing the answer", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Patient History & Continuity" }).click();
    await page.getByTestId("scenario-clinical-summary").click();

    await waitForResponse(page);

    await expect(page.getByTestId("response-content")).toBeVisible();
    await expect(page.getByTestId("inspector-panel")).not.toBeVisible();

    await page.getByTestId("inspector-toggle").click();
    await expect(page.getByTestId("inspector-panel")).toBeVisible();
    await expect(page.getByTestId("reasoning")).toBeVisible();
    await expect(page.getByTestId("citations")).toBeVisible();
    await expect(page.getByTestId("tools-used")).toBeVisible();

    await page.getByTestId("inspector-close").click();
    await expect(page.getByTestId("inspector-panel")).not.toBeVisible();
    await expect(page.getByTestId("response-content")).toBeVisible();
  });

  test("inspector drawer stays inside the viewport with long detail payloads", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto("/");

    await page.getByRole("button", { name: "Quality & Performance" }).click();
    await page.getByTestId("scenario-quality-practitioners").click();

    await waitForResponse(page);

    await page.getByTestId("inspector-toggle").click();

    const panel = page.getByTestId("inspector-panel");
    await expect(panel).toBeVisible();

    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(1280);

    const hasOverflow = await panel.evaluate((node) => node.scrollWidth > node.clientWidth);
    expect(hasOverflow).toBe(false);
  });
});
