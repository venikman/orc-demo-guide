# FHIR Copilot UI

Chat-first front-end for the FHIR Copilot Agent Framework. Sends natural-language queries to a multi-agent backend that routes them to specialised FHIR agents (lookup, search, analytics, clinical, cohort, export).

## Quick start

```bash
# 1. Start the agents server on port 5075 (separate repo)

# 2. Install and run
npm install
npm run dev          # opens http://localhost:5173
```

Create a `.env` file (gitignored):

```env
API_URL=http://localhost:5075
DEV_PORT=5173
```

The `dev` script loads it via `node --env-file=.env`. Both variables have hardcoded defaults, so the app works without the file.

## How it works

```
Browser ──SignalR WS──▸ Vite proxy ──▸ Agents API (localhost:5075)
           /hubs/copilot               /hubs/copilot  (SignalR hub)
           /api/*                      /api/copilot    (REST fallback)
```

The UI opens a persistent SignalR WebSocket connection to `/hubs/copilot`. Queries are streamed via `StreamQuery`, which yields `ServerEvent` items (`meta` → `delta`\* → `done`). The Vite dev server proxies both HTTP (`/api`) and WebSocket (`/hubs`) traffic to the agents server.

## Testing

Tests run against a live agents server — no mocks.

```bash
npm test                              # all 37 E2E tests
npx playwright test e2e/copilot.spec.ts  # single file
```

Playwright auto-starts a Vite dev server on port 5173. Tests do **not** load `.env` — they rely on the hardcoded defaults in `vite.config.ts` and `playwright.config.ts`.

## Stack

| Layer     | Tech                           |
| --------- | ------------------------------ |
| Framework | React 19                       |
| Build     | Vite 8 / vite-plus             |
| Styling   | Tailwind CSS 4, shadcn         |
| Transport | @microsoft/signalr (WebSocket) |
| Tests     | Playwright                     |
| Rendering | @json-render (spec-driven UI)  |
