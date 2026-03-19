import type { Page } from "@playwright/test";

const RESPONSE_TIMEOUT = 30_000;

export async function waitForResponse(page: Page): Promise<void> {
  await page.getByTestId("response-content").waitFor({ timeout: RESPONSE_TIMEOUT });
}
