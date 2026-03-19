# FHIR Copilot UI

React + Vite front-end for the FHIR Copilot Agent Framework.

## Architecture

Two separate servers:

| Server            | Default                 | Purpose                                      |
| ----------------- | ----------------------- | -------------------------------------------- |
| **UI (Vite dev)** | `http://localhost:5173` | Serves the React SPA                         |
| **Agents API**    | `http://localhost:5075` | .NET backend — routes queries to FHIR agents |

The Vite dev server proxies both REST and WebSocket traffic to the agents server:

- `/api/*` → REST (copilot sync/stream endpoints)
- `/hubs/*` → SignalR WebSocket (`/hubs/copilot` hub)

## Transport

The UI communicates with the agents server over **SignalR WebSocket** (`@microsoft/signalr`).
The hub at `/hubs/copilot` exposes `StreamQuery(CopilotRequest)` which yields `ServerEvent` items
(`meta`, `delta`, `tool`, `done`, `error`) as an async stream.

The connection is created once on mount, auto-reconnects, and is reused across queries.
Thread identity (`threadId`) is managed client-side and reset on "Clear".

## Environment variables

Defined in `.env` (gitignored). Loaded in dev via `node --env-file=.env`.

| Variable   | Default                 | Used by                | Purpose                                   |
| ---------- | ----------------------- | ---------------------- | ----------------------------------------- |
| `API_URL`  | `http://localhost:5075` | `vite.config.ts`       | Agents server URL for the Vite proxy      |
| `DEV_PORT` | `5173`                  | `playwright.config.ts` | Port for the Vite dev server during tests |

**Tests do NOT load the `.env` file.** Playwright spawns its own Vite dev server via
`npx vp dev` (no `--env-file`), so the hardcoded defaults in `vite.config.ts` and
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

Playwright auto-starts a Vite dev server for the tests. If one is already running on the
same port, it reuses it (unless `CI=true`).

## Key decisions

- **SignalR over SSE**: switched from SSE (`/api/copilot/stream`) to SignalR WebSocket
  (`/hubs/copilot`) for persistent bidirectional connection. SignalR handles reconnection,
  transport negotiation, and stream cancellation natively.

- **No `.env` in tests**: tests rely on hardcoded defaults so they work in CI without
  env file setup. The `dev` script uses `node --env-file=.env` (Node 20+) to load vars
  at the process level — Vite's built-in `.env` loading only populates `import.meta.env`,
  not `process.env` in `vite.config.ts`.

- **Fast-backend-safe tests**: E2E tests don't assert on transient states (pending/streaming)
  that may resolve in < 5ms. Instead they assert on the final outcome (response rendered,
  button re-enabled) and tolerate the transient states being too fast to observe.

## Commands

| Command         | What it does                             |
| --------------- | ---------------------------------------- |
| `npm run dev`   | Start Vite dev server with `.env` loaded |
| `npm run build` | Production build                         |
| `npm test`      | Run Playwright E2E suite                 |
| `npm run check` | Type-check via vite-plus                 |
