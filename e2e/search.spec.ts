import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:8787";

// -- API-level tests (fast, no browser) --

test.describe("API: health", () => {
  test("returns ok", async ({ request }) => {
    const res = await request.get(`${API}/api/health`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.timestamp).toBeTruthy();
  });
});

test.describe("API: presets", () => {
  test("returns three presets", async ({ request }) => {
    const res = await request.get(`${API}/api/presets`);
    const body = await res.json();
    expect(body.presets).toHaveLength(3);
    expect(body.presets.map((p: { id: string }) => p.id)).toEqual(["admin", "nurse", "provider"]);
  });
});

test.describe("API: search", () => {
  test("success flow returns results", async ({ request }) => {
    const res = await request.post(`${API}/api/search`, {
      data: {
        prompt: "Patients with diabetes in the Emergency Department",
        presetId: "provider",
      },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();

    expect(body.status).toBe("success");
    expect(body.plan.intent).toBe("find_encounters");
    expect(body.plan.filters.length).toBeGreaterThanOrEqual(1);
    expect(body.results.length).toBeGreaterThan(0);
    expect(body.stats.matched).toBeGreaterThan(0);
    expect(body.policyDecision.action).toBe("allow");
    expect(body.trace.length).toBeGreaterThanOrEqual(5);
    expect(body.monitoring.aiUsage.provider).toBe("google_genai");
  });

  test("deny flow blocks unsafe requests", async ({ request }) => {
    const res = await request.post(`${API}/api/search`, {
      data: {
        prompt: "What medication should I prescribe for this patient?",
        presetId: "provider",
      },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();

    expect(body.status).toBe("deny");
    expect(body.policyDecision.action).toBe("deny");
    expect(body.denialReason).toBeTruthy();
    expect(body.results).toHaveLength(0);
    expect(body.totalResults).toBe(0);
  });

  test("clarify flow requests missing fields", async ({ request }) => {
    const res = await request.post(`${API}/api/search`, {
      data: {
        prompt: "Show me some encounters",
        presetId: "provider",
      },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();

    expect(body.status).toBe("clarify");
    expect(body.policyDecision.action).toBe("escalate");
    expect(body.plan.missingFields.length).toBeGreaterThan(0);
    expect(body.results).toHaveLength(0);
  });

  test("admin preset hides conditions", async ({ request }) => {
    const res = await request.post(`${API}/api/search`, {
      data: {
        prompt: "Patients with diabetes in the Emergency Department",
        presetId: "admin",
      },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();

    if (body.status === "success" && body.results.length > 0) {
      expect(body.policyDecision.field_visibility.conditions).toBe("hidden");
      expect(body.policyDecision.field_visibility.dob).toBe("redacted");
    }
  });

  test("rejects invalid payload", async ({ request }) => {
    const res = await request.post(`${API}/api/search`, {
      data: { prompt: "", presetId: "invalid" },
    });
    expect(res.status()).toBe(400);
  });
});

// -- Browser UI tests --

test.describe("UI: search flow", () => {
  test("loads and displays search form", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#cohort-query")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("success search displays results", async ({ page }) => {
    await page.goto("/");

    const input = page.locator("#cohort-query");
    await input.fill("Patients with diabetes in the Emergency Department");
    await page.locator('button[type="submit"]').click();

    // Wait for results to load (button text changes back from "Running...")
    await expect(page.locator('button[type="submit"]')).not.toContainText("Running", {
      timeout: 30_000,
    });

    // Check result status badge appears
    await expect(page.getByText("success")).toBeVisible({ timeout: 5_000 });

    // Check metrics section renders
    await expect(page.getByText("Matched", { exact: true })).toBeVisible();
    await expect(page.getByText("Filters", { exact: true })).toBeVisible();
    await expect(page.getByText("Latency", { exact: true })).toBeVisible();
  });

  test("deny search shows denial reason", async ({ page }) => {
    await page.goto("/");

    const input = page.locator("#cohort-query");
    await input.fill("What medication should I prescribe for this patient?");
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('button[type="submit"]')).not.toContainText("Running", {
      timeout: 30_000,
    });

    await expect(page.locator('[data-slot="badge"]').getByText("deny")).toBeVisible({ timeout: 5_000 });
  });
});
