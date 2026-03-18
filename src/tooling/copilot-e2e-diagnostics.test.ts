import { describe, expect, test } from "vite-plus/test"

import { buildCopilotWaitError } from "../../e2e/support/copilot.ts"

describe("copilot e2e diagnostics", () => {
  test("reports timeout context with pending state and network activity", () => {
    const message = buildCopilotWaitError({
      outcome: "timeout",
      pendingVisible: true,
      queryText: "What insurance does patient-0001 have?",
      errorText: null,
      responseVisible: false,
      networkEvents: [
        { phase: "request", method: "POST", url: "http://127.0.0.1:5173/api/copilot" },
        { phase: "response", status: 504, url: "http://127.0.0.1:5173/api/copilot" },
      ],
    })

    expect(message).toContain("Timed out waiting for copilot response.")
    expect(message).toContain("Query: What insurance does patient-0001 have?")
    expect(message).toContain("Pending state visible: yes")
    expect(message).toContain("POST http://127.0.0.1:5173/api/copilot")
    expect(message).toContain("504 http://127.0.0.1:5173/api/copilot")
  })

  test("reports rendered error state distinctly from timeout", () => {
    const message = buildCopilotWaitError({
      outcome: "error",
      pendingVisible: false,
      queryText: "First question",
      errorText: "Request failed with status 500",
      responseVisible: false,
      networkEvents: [{ phase: "response", status: 500, url: "/api/copilot" }],
    })

    expect(message).toContain("Copilot rendered an error state.")
    expect(message).toContain("Error: Request failed with status 500")
    expect(message).toContain("500 /api/copilot")
  })
})
