import { test, expect } from "@playwright/test";
import { waitForResponse } from "./support/helpers.ts";

test.describe("Post-Response Panels", () => {
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
});
