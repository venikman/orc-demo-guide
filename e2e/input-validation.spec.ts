import { test, expect } from "@playwright/test";
import { waitForResponse } from "./support/helpers.ts";

test.describe("Input Validation", () => {
  test("send button disabled when input empty", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("send-button")).toBeDisabled();
  });

  test("send button disabled with whitespace-only input", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("custom-input").fill("   ");

    await expect(page.getByTestId("send-button")).toBeDisabled();
  });

  test("send button enabled with valid input", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("custom-input").fill("test query");

    await expect(page.getByTestId("send-button")).toBeEnabled();
  });

  test("primary action uses the adapted preset brand color", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("custom-input").fill("test query");

    const { backgroundColor, primaryToken } = await page
      .getByTestId("send-button")
      .evaluate((element) => {
        return {
          backgroundColor: window.getComputedStyle(element).backgroundColor,
          primaryToken: window
            .getComputedStyle(document.documentElement)
            .getPropertyValue("--primary")
            .trim(),
        };
      });

    expect(backgroundColor).toBe(primaryToken);
  });

  test("Enter key submits query", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("custom-input").fill("How many patients?");
    await page.getByTestId("custom-input").press("Enter");

    await waitForResponse(page);

    await expect(page.getByTestId("query-display")).toHaveText("How many patients?");
    await expect(page.getByTestId("idle-message")).not.toBeVisible();
  });

  test("input clears after submit", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("custom-input").fill("How many patients?");
    await page.getByTestId("custom-input").press("Enter");

    await expect(page.getByTestId("custom-input")).toHaveValue("");
  });
});
