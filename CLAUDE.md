# FHIR Copilot UI

React + Rsbuild front-end for the FHIR Copilot Agent Framework.

## Architecture

Two separate servers:

| Server            | Default                 | Purpose                                      |
| ----------------- | ----------------------- | -------------------------------------------- |
| **UI (Rsbuild dev)** | `http://localhost:5173` | Serves the React SPA                      |
| **Agents API**    | `http://localhost:5075` | .NET backend — routes queries to FHIR agents |

The Rsbuild dev server proxies WebSocket traffic to the agents server:

- `/hubs/*` → SignalR WebSocket (`/hubs/copilot` hub)

## Transport

The UI communicates with the agents server over **SignalR WebSocket** (`@microsoft/signalr`).
The hub at `/hubs/copilot` exposes `StreamQuery(CopilotRequest)` which yields `ServerEvent` items
(`meta`, `delta`, `tool`, `done`, `error`) as an async stream.

The connection is created once on mount, auto-reconnects, and is reused across queries.
Thread identity (`threadId`) is managed client-side and reset on "Clear".

## Environment variables

Defined in `.env` (gitignored). Loaded in dev via `node --env-file=.env`.

| Variable      | Default                 | Used by                | Purpose                                             |
| ------------- | ----------------------- | ---------------------- | --------------------------------------------------- |
| `API_URL`     | `http://localhost:5075` | `rsbuild.config.ts`    | Agents server URL for the Rsbuild dev proxy         |
| `DEV_PORT`    | `5173`                  | `playwright.config.ts` | Port for the Rsbuild dev server during tests        |
| `VITE_WS_URL` | —                       | `use-copilot.ts`       | Production agents server origin (set in Cloudflare) |

**Tests do NOT load the `.env` file.** Playwright spawns its own Rsbuild dev server via
`npx rsbuild dev` (no `--env-file`), so the hardcoded defaults in `rsbuild.config.ts` and
`playwright.config.ts` are used. This is intentional — tests should work without any env setup
as long as the agents server is running at `http://localhost:5075`.

## Local development

```bash
# 1. Start the agents server (separate repo/process) on port 5075
# 2. Install dependencies
npm install

# 3. Start the UI dev server (loads .env automatically)
npm run dev
```

## Running tests

Tests require the agents server running at `http://localhost:5075`.

```bash
# Run all E2E tests
npm test

# Run a specific test file
npx playwright test e2e/copilot.spec.ts
```

Playwright auto-starts an Rsbuild dev server for the tests. If one is already running on the
same port, it reuses it (unless `CI=true`).

## Key decisions

- **SignalR WebSocket**: the UI connects to the `/hubs/copilot` SignalR hub for
  persistent bidirectional streaming. SignalR handles reconnection, transport
  negotiation, and stream cancellation natively. In dev, the Rsbuild proxy forwards
  `/hubs/*` to the local agents server. In production, `VITE_WS_URL` points the
  client directly at the agents server origin (no proxy).

- **No `.env` in tests**: tests rely on hardcoded defaults so they work in CI without
  env file setup. The `dev` script uses `node --env-file=.env` (Node 20+) to load vars
  at the process level so `process.env.API_URL` is available in `rsbuild.config.ts`.

- **Fast-backend-safe tests**: E2E tests don't assert on transient states (pending/streaming)
  that may resolve in < 5ms. Instead they assert on the final outcome (response rendered,
  button re-enabled) and tolerate the transient states being too fast to observe.

## Commands

| Command         | What it does                             |
| --------------- | ---------------------------------------- |
| `npm run dev`   | Start Rsbuild dev server with `.env` loaded |
| `npm run build` | Production build via Rsbuild                |
| `npm test`      | Run Playwright E2E suite                    |
| `npm run check` | Lint (oxlint) + type-check (tsc)            |
