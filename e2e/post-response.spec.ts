import { test, expect } from "@playwright/test"
import { expandWorkflowForScenario, mockCopilotApi } from "./support/copilot.ts"

test.describe("Post-Response Panels", () => {
  test("response badges and inline code use the shell styling system", async ({ page }) => {
    await mockCopilotApi(page, {
      response: () => ({
        answer:
          "Patient `Patient/patient-0001` is covered by the Northwind Health Plan (`Organization/org-payer-001`).",
        agentUsed: "lookup",
        citations: [{ resourceType: "Patient", id: "patient-0001" }],
        confidence: "high",
        reasoning: ["Classified the query for the lookup agent"],
        toolsUsed: ["fhir_read_resource"],
      }),
    })
    await page.goto("/")

    await expandWorkflowForScenario(page, "member-insurance")
    await page.getByTestId("scenario-member-insurance").click()

    const response = page.getByTestId("response-content")
    const badges = response.locator('[data-slot="badge"]')
    const inlineCode = response.locator("code").first()

    await expect(badges).toHaveCount(2)
    await expect(inlineCode).toBeVisible()

    const badgeRadius = await badges.first().evaluate((node) => getComputedStyle(node).borderRadius)
    const codeFontFamily = await inlineCode.evaluate((node) => getComputedStyle(node).fontFamily)

    expect(badgeRadius).toBe("0px")
    expect(codeFontFamily.toLowerCase()).toContain("geist")
  })

  test("reasoning panel is hidden by default and opens from the inspector toggle", async ({ page }) => {
    await mockCopilotApi(page)
    await page.goto("/")

    await expandWorkflowForScenario(page, "clinical-summary")
    await page.getByTestId("scenario-clinical-summary").click()

    const reasoning = page.getByTestId("reasoning")
    await expect(page.getByTestId("inspector-panel")).not.toBeVisible()
    await expect(reasoning).not.toBeVisible()

    await page.getByTestId("inspector-toggle").click()
    await expect(page.getByTestId("inspector-panel")).toBeVisible()
    await expect(reasoning).toContainText("Classified the query")
  })

  test("citations list renders inside the inspector only after toggling", async ({ page }) => {
    await mockCopilotApi(page)
    await page.goto("/")

    await expandWorkflowForScenario(page, "member-insurance")
    await page.getByTestId("scenario-member-insurance").click()

    const citations = page.getByTestId("citations")
    await expect(citations).not.toBeVisible()

    await page.getByTestId("inspector-toggle").click()
    await expect(citations).toContainText("patient-0001")
  })

  test("inspector can be opened and closed without losing the answer", async ({ page }) => {
    await mockCopilotApi(page)
    await page.goto("/")

    await expandWorkflowForScenario(page, "clinical-summary")
    await page.getByTestId("scenario-clinical-summary").click()

    await expect(page.getByTestId("response-content")).toBeVisible()
    await expect(page.getByTestId("inspector-panel")).not.toBeVisible()

    await page.getByTestId("inspector-toggle").click()
    await expect(page.getByTestId("inspector-panel")).toBeVisible()
    await expect(page.getByTestId("reasoning")).toBeVisible()
    await expect(page.getByTestId("citations")).toBeVisible()
    await expect(page.getByTestId("tools-used")).toBeVisible()

    await page.getByTestId("inspector-close").click()
    await expect(page.getByTestId("inspector-panel")).not.toBeVisible()
    await expect(page.getByTestId("response-content")).toBeVisible()
  })

  test("inspector drawer stays inside the viewport with long detail payloads", async ({ page }) => {
    await mockCopilotApi(page, {
      response: (query) => ({
        answer: `Final answer for ${query}`,
        agentUsed: "analytics",
        citations: [
          { resourceType: "Encounter", id: "encounter-super-long-resource-reference-0001-with-extra-context" },
        ],
        confidence: "high",
        reasoning: [
          "Classified the query and assembled a very long reasoning trace for analytics review.",
          "Expanded the response with additional detail so the sheet has to handle long copy without breaking the viewport.",
        ],
        toolsUsed: [
          "fhir_search_encounters_with_a_really_long_tool_name_that_should_not_stretch_the_drawer_off_screen",
        ],
      }),
    })
    await page.setViewportSize({ width: 1280, height: 1200 })
    await page.goto("/")

    await expandWorkflowForScenario(page, "quality-practitioners")
    await page.getByTestId("scenario-quality-practitioners").click()
    await page.getByTestId("inspector-toggle").click()

    const panel = page.getByTestId("inspector-panel")
    await expect(panel).toBeVisible()

    const box = await panel.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x).toBeGreaterThanOrEqual(840)
    expect(box!.x + box!.width).toBeLessThanOrEqual(1280)

    const hasOverflow = await panel.evaluate((node) => node.scrollWidth > node.clientWidth)
    expect(hasOverflow).toBe(false)
  })
})
