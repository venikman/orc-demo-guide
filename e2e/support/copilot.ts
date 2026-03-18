import { expect, type Page } from "@playwright/test"
import { workflows } from "../../src/client/scenarios.ts"

type CopilotWaitOutcome = "error" | "timeout"

interface CopilotNetworkEvent {
  phase: "request" | "requestfailed" | "response"
  url: string
  method?: string
  status?: number
  failureText?: string
}

interface CopilotDiagnosticSnapshot {
  outcome: CopilotWaitOutcome
  pendingVisible: boolean
  queryText: string | null
  errorText: string | null
  responseVisible: boolean
  networkEvents: CopilotNetworkEvent[]
}

const copilotEventsByPage = new WeakMap<Page, CopilotNetworkEvent[]>()

function isCopilotRequest(url: string, method?: string) {
  return url.includes("/api/copilot") && (method === undefined || method === "POST")
}

function pushCopilotEvent(page: Page, event: CopilotNetworkEvent) {
  const events = copilotEventsByPage.get(page) ?? []
  events.push(event)
  copilotEventsByPage.set(page, events.slice(-10))
}

function ensureCopilotTracking(page: Page) {
  if (copilotEventsByPage.has(page)) return

  copilotEventsByPage.set(page, [])

  page.on("request", (request) => {
    if (!isCopilotRequest(request.url(), request.method())) return

    pushCopilotEvent(page, {
      phase: "request",
      method: request.method(),
      url: request.url(),
    })
  })

  page.on("response", (response) => {
    const request = response.request()
    if (!isCopilotRequest(response.url(), request.method())) return

    pushCopilotEvent(page, {
      phase: "response",
      status: response.status(),
      url: response.url(),
    })
  })

  page.on("requestfailed", (request) => {
    if (!isCopilotRequest(request.url(), request.method())) return

    pushCopilotEvent(page, {
      phase: "requestfailed",
      method: request.method(),
      url: request.url(),
      failureText: request.failure()?.errorText,
    })
  })
}

function collapseText(value: string | null) {
  return value?.replace(/\s+/g, " ").trim() || null
}

async function getVisibleText(page: Page, testId: string) {
  const locator = page.getByTestId(testId)
  return (await locator.isVisible()) ? collapseText(await locator.textContent()) : null
}

function formatNetworkEvent(event: CopilotNetworkEvent) {
  if (event.phase === "request") {
    return `${event.method ?? "REQUEST"} ${event.url}`
  }

  if (event.phase === "response") {
    return `${event.status ?? "unknown"} ${event.url}`
  }

  return `${event.method ?? "REQUEST"} ${event.url} failed${event.failureText ? ` (${event.failureText})` : ""}`
}

export function buildCopilotWaitError(snapshot: CopilotDiagnosticSnapshot) {
  const lines = [
    snapshot.outcome === "error"
      ? "Copilot rendered an error state."
      : "Timed out waiting for copilot response.",
    `Pending state visible: ${snapshot.pendingVisible ? "yes" : "no"}`,
    `Response content visible: ${snapshot.responseVisible ? "yes" : "no"}`,
  ]

  if (snapshot.queryText) {
    lines.push(`Query: ${snapshot.queryText}`)
  }

  if (snapshot.errorText) {
    lines.push(`Error: ${snapshot.errorText}`)
  }

  if (snapshot.networkEvents.length > 0) {
    lines.push("Recent /api/copilot activity:")
    lines.push(...snapshot.networkEvents.map((event) => `- ${formatNetworkEvent(event)}`))
  } else {
    lines.push("Recent /api/copilot activity: none observed")
  }

  return lines.join("\n")
}

export async function waitForCopilotResponse(page: Page, timeout = 30_000) {
  ensureCopilotTracking(page)

  const response = page.getByTestId("response-content")
  const error = page.getByTestId("error-message")
  const pending = page.getByTestId("pending-state")
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    if (await response.isVisible()) {
      return
    }

    if (await error.isVisible()) {
      break
    }

    await page.waitForTimeout(250)
  }

  const snapshot: CopilotDiagnosticSnapshot = {
    outcome: (await error.isVisible()) ? "error" : "timeout",
    pendingVisible: await pending.isVisible(),
    queryText: await getVisibleText(page, "query-display"),
    errorText: await getVisibleText(page, "error-message"),
    responseVisible: await response.isVisible(),
    networkEvents: copilotEventsByPage.get(page) ?? [],
  }

  throw new Error(buildCopilotWaitError(snapshot))
}

export async function expandWorkflowForScenario(page: Page, scenarioId: string) {
  const workflow = workflows.find((entry) =>
    entry.scenarios.some((scenario) => scenario.id === scenarioId),
  )

  if (!workflow) {
    throw new Error(`Unknown scenario ${scenarioId}`)
  }

  await page.getByRole("button", { name: workflow.label }).click()
}
