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

Both variables have hardcoded defaults, so the app works without the file.

## How it works

```
Dev:   Browser ──SignalR WS──▸ Vite proxy ──▸ Agents API (localhost:5075)
Prod:  Browser ──SignalR WS──▸ Agents API   (VITE_WS_URL origin)
                 /hubs/copilot               /hubs/copilot  (SignalR hub)
```

The UI opens a persistent SignalR WebSocket connection to `/hubs/copilot`. Queries are streamed via `StreamQuery`, which yields `ServerEvent` items (`meta` → `delta`\* → `done`).

## Testing

Tests run against a live agents server — no mocks.

```bash
npm test                                  # all E2E tests
npx playwright test e2e/copilot.spec.ts   # single file
```

## Stack

| Layer     | Tech                           |
| --------- | ------------------------------ |
| Framework | React 19                       |
| Build     | Vite 8                         |
| Styling   | Tailwind CSS 4                 |
| Transport | @microsoft/signalr (WebSocket) |
| Markdown  | Streamdown (streaming)         |
| Tests     | Playwright                     |
