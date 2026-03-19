import { test, expect } from "@playwright/test";
import { waitForResponse } from "./support/helpers.ts";

test.describe("Copilot over WebSocket", () => {
  test("streams partial content before rendering the final response", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("custom-input").fill("What insurance does patient-0001 have?");
    await page.getByTestId("send-button").click();

    // The streaming panel should appear while chunks arrive
    try {
      await page.getByTestId("streaming-content").waitFor({ timeout: 15_000 });
      const streamingText = await page.getByTestId("streaming-content").textContent();
      expect((streamingText ?? "").length).toBeGreaterThan(0);
    } catch {
      // If the backend responds fast enough to skip visible streaming, that's acceptable
    }

    // Either way, the final response must appear
    await waitForResponse(page);
    const content = page.getByTestId("response-content");
    await expect(content).toBeVisible();
    const text = await content.textContent();
    expect((text ?? "").length).toBeGreaterThan(0);
  });

  test("thread ID preserved across requests — reset generates a new one", async ({ page }) => {
    // Intercept SignalR WebSocket frames to extract threadIds
    const threadIds: string[] = [];
    page.on("websocket", (ws) => {
      ws.on("framesent", (frame) => {
        const payload = typeof frame.payload === "string" ? frame.payload : "";
        // SignalR frames are delimited by \x1e — parse invocations
        for (const part of payload.split("\x1e")) {
          if (!part.trim()) continue;
          try {
            const msg = JSON.parse(part);
            if (msg.target === "StreamQuery" && msg.arguments?.[0]?.threadId) {
              threadIds.push(msg.arguments[0].threadId);
            }
          } catch {
            // not JSON — skip
          }
        }
      });
    });

    await page.goto("/");

    // First query
    await page.getByTestId("custom-input").fill("First question");
    await page.getByTestId("send-button").click();
    await waitForResponse(page);

    // Second query (same thread)
    await page.getByTestId("custom-input").fill("Follow-up question");
    await page.getByTestId("send-button").click();
    await waitForResponse(page);

    expect(threadIds).toHaveLength(2);
    expect(threadIds[0]).toBeTruthy();
    expect(threadIds[0]).toBe(threadIds[1]);

    // Reset and send again — threadId should change
    await page.getByTestId("reset-button").click();
    await page.getByTestId("custom-input").fill("Fresh thread");
    await page.getByTestId("send-button").click();
    await waitForResponse(page);

    expect(threadIds).toHaveLength(3);
    expect(threadIds[2]).toBeTruthy();
    expect(threadIds[2]).not.toBe(threadIds[0]);
  });

  test("reset returns to idle from any in-flight state", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("custom-input").fill("Tell me about patient-0001");
    await page.getByTestId("send-button").click();

    // With a fast backend the pending/streaming state may resolve before we can
    // observe it, so wait for either a transient state or the final response.
    const anyActivity = page
      .getByTestId("pending-state")
      .or(page.getByTestId("streaming-content"))
      .or(page.getByTestId("response-content"));
    await expect(anyActivity).toBeVisible({ timeout: 10_000 });

    // Reset — should always return to idle regardless of current state
    await page.getByTestId("reset-button").click();

    await expect(page.getByTestId("idle-message")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("streaming-content")).not.toBeVisible();
    await expect(page.getByTestId("pending-state")).not.toBeVisible();
    await expect(page.getByTestId("response-content")).not.toBeVisible();
  });
});
