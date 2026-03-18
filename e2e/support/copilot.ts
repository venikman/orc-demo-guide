import type { Page } from "@playwright/test"
import { allScenarios, workflows } from "../../src/client/scenarios.ts"
import type { AgentResponse, AgentType } from "../../src/client/types.ts"

const scenarioAgentByQuery = new Map(allScenarios.map((scenario) => [scenario.query, scenario.agent]))

function inferAgent(query: string): AgentType {
  const exact = scenarioAgentByQuery.get(query)
  if (exact) return exact

  const lower = query.toLowerCase()
  if (lower.includes("how many") || lower.includes("compare") || lower.includes("top")) {
    return "analytics"
  }
  if (lower.includes("summary") || lower.includes("plain english")) {
    return "clinical"
  }
  if (lower.includes("without") || lower.includes("gap") || lower.includes("at risk")) {
    return "cohort"
  }
  if (lower.includes("export")) {
    return "export"
  }
  if (lower.includes("find") || lower.includes("encounter")) {
    return "search"
  }
  return "lookup"
}

function buildResponse(query: string): AgentResponse {
  const agent = inferAgent(query)

  return {
    answer: `Final answer for ${query}`,
    agentUsed: agent,
    citations: [
      {
        resourceType: agent === "analytics" ? "Encounter" : "Patient",
        id: agent === "analytics" ? "encounter-0001" : "patient-0001",
      },
    ],
    confidence: "high",
    reasoning: [
      `Classified the query for the ${agent} agent`,
      `Synthesized the final answer for ${query}`,
    ],
    toolsUsed:
      agent === "analytics"
        ? ["fhir_search_encounters", "calculator"]
        : ["fhir_read_resource"],
  }
}

export async function mockCopilotApi(
  page: Page,
  options: {
    delayMs?: number
    status?: number
    response?: (query: string, threadId?: string) => AgentResponse
  } = {},
) {
  const requests: Array<{ query?: string; threadId?: string }> = []

  await page.route("**/api/copilot", async (route) => {
    const body = route.request().postDataJSON() as {
      query?: string
      threadId?: string
    }

    requests.push(body)

    if (options.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs))
    }

    if (options.status && options.status >= 400) {
      await route.fulfill({
        body: "Server error",
        contentType: "text/plain",
        status: options.status,
      })
      return
    }

    const query = body.query ?? ""
    const payload = options.response?.(query, body.threadId) ?? buildResponse(query)

    await route.fulfill({
      body: JSON.stringify(payload),
      contentType: "application/json",
      status: 200,
    })
  })

  return { requests }
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
