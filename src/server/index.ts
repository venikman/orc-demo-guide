import { Hono } from "hono";
import { serveStatic } from "hono/bun";

import type { SearchResponseEnvelope } from "../../validation-schema";
import { searchRequestInputSchema } from "../../validation-schema";
import { compileSearchPlan, GeminiModelRequirementError } from "./lib/compile";
import { logEvent } from "./lib/logging";
import { getPreset, getPresetSummaries } from "./lib/presets";
import { executeSearch } from "./lib/retrieve";

const app = new Hono();
type ErrorStatusCode = 400 | 500 | 502 | 503;

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    timestamp: new Date().toISOString(),
  }),
);

app.get("/api/presets", (c) =>
  c.json({
    presets: getPresetSummaries(),
  }),
);

app.post("/api/search", async (c) => {
  let requestId: string | null = null;

  try {
    requestId = crypto.randomUUID();
    const payload = searchRequestInputSchema.parse(await c.req.json());
    const preset = getPreset(payload.presetId);
    logEvent("api.search.request", {
      request_id: requestId,
      preset_id: payload.presetId,
      prompt: payload.prompt,
    });

    const { plan, sourceMode, modelUsed } = await compileSearchPlan(payload.prompt, {
      requestId,
      presetId: payload.presetId,
    });
    const response = executeSearch(payload.prompt, preset, plan, sourceMode, requestId, modelUsed);

    logEvent("api.search.response", {
      request_id: requestId,
      status: response.status,
      source_mode: response.sourceMode,
      model_used: response.modelUsed,
      matched: response.totalResults,
      latency_ms: response.stats.latencyMs,
      filters: plan.filters,
      clarification_question: response.clarificationQuestion,
      denial_reason: response.denialReason,
      preview_names: response.results.slice(0, response.previewCount).map((result) => result.name),
    });

    return c.json<SearchResponseEnvelope>(response);
  } catch (error) {
    const statusCode: ErrorStatusCode =
      error instanceof GeminiModelRequirementError
        ? (error.statusCode as ErrorStatusCode)
        : error instanceof Error && error.name === "ZodError"
          ? 400
          : 500;

    logEvent("api.search.error", {
      request_id: requestId,
      status_code: statusCode,
      error: error instanceof Error ? error.message : "Unexpected server error",
    });
    return c.json(
      {
        error: error instanceof Error ? error.message : "Unexpected server error",
      },
      statusCode,
    );
  }
});

app.use("*", serveStatic({ root: "./dist/client" }));

const port = Number(process.env.PORT ?? 8787);
console.log(`Server listening on http://127.0.0.1:${port}`);

Bun.serve({
  port,
  fetch: app.fetch,
});
