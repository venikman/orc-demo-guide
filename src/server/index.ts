import { Hono } from "hono";
import { serveStatic } from "hono/bun";

import type { SearchResponseEnvelope } from "../../validation-schema";
import { searchRequestInputSchema } from "../../validation-schema";
import { GeminiModelRequirementError } from "./lib/compile";
import { logEvent } from "./lib/logging";
import { getPresetSummaries } from "./lib/presets";
import { runSearchWorkflow } from "./lib/search-workflow";

const app = new Hono();
const encoder = new TextEncoder();
type ErrorStatusCode = 400 | 500 | 502 | 503;

function getErrorStatusCode(error: unknown): ErrorStatusCode {
  if (error instanceof GeminiModelRequirementError) {
    return error.statusCode as ErrorStatusCode;
  }

  if (error instanceof Error && error.name === "ZodError") {
    return 400;
  }

  return 500;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected server error";
}

function getThreadId(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const config = (payload as Record<string, unknown>).config;
  if (!config || typeof config !== "object") {
    return undefined;
  }

  const configurable = (config as Record<string, unknown>).configurable;
  if (!configurable || typeof configurable !== "object") {
    return undefined;
  }

  const threadId = (configurable as Record<string, unknown>).thread_id;
  return typeof threadId === "string" ? threadId : undefined;
}

function createSseResponse(
  run: (send: (event: string, data: unknown) => void) => Promise<void>,
) {
  return new Response(
    new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          await run(send);
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    },
  );
}

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
  const requestId = crypto.randomUUID();

  try {
    const payload = searchRequestInputSchema.parse(await c.req.json());
    const response = await runSearchWorkflow({
      requestId,
      prompt: payload.prompt,
      presetId: payload.presetId,
      transport: "request_reply",
    });

    return c.json<SearchResponseEnvelope>(response);
  } catch (error) {
    const statusCode = getErrorStatusCode(error);

    logEvent("api.search.error", {
      request_id: requestId,
      status_code: statusCode,
      error: getErrorMessage(error),
    });
    return c.json(
      {
        error: getErrorMessage(error),
      },
      statusCode,
    );
  }
});

app.post("/api/search/stream", async (c) => {
  const requestId = crypto.randomUUID();

  try {
    const payload = await c.req.json();
    const input = searchRequestInputSchema.parse(
      payload && typeof payload === "object" ? (payload as Record<string, unknown>).input : payload,
    );
    const threadId = getThreadId(payload);

    return createSseResponse(async (send) => {
      try {
        send("values", {
          prompt: input.prompt,
          presetId: input.presetId,
          response: null,
        });

        const response = await runSearchWorkflow({
          requestId,
          prompt: input.prompt,
          presetId: input.presetId,
          transport: "use_stream",
          threadId,
        });

        send("values", {
          prompt: input.prompt,
          presetId: input.presetId,
          response,
        });
      } catch (error) {
        const statusCode = getErrorStatusCode(error);
        logEvent("api.search.error", {
          request_id: requestId,
          status_code: statusCode,
          error: getErrorMessage(error),
          transport: "use_stream",
          thread_id: threadId ?? null,
        });

        send("error", {
          requestId,
          statusCode,
          message: getErrorMessage(error),
        });
      }
    });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    logEvent("api.search.error", {
      request_id: requestId,
      status_code: statusCode,
      error: getErrorMessage(error),
      transport: "use_stream",
    });

    return createSseResponse(async (send) => {
      send("error", {
        requestId,
        statusCode,
        message: getErrorMessage(error),
      });
    });
  }
});

app.use("*", serveStatic({ root: "./dist/client" }));

const port = Number(process.env.PORT ?? 8787);
console.log(`Server listening on http://127.0.0.1:${port}`);

Bun.serve({
  port,
  fetch: app.fetch,
});
