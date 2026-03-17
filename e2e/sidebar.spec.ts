import { test, expect } from "@playwright/test"

test.describe("Scenario Sidebar", () => {
  test("workflow expand/collapse toggles description visibility", async ({
    page,
  }) => {
    await page.goto("/")

    const sidebar = page.locator("aside")
    const header = sidebar.getByRole("button", { name: "Care Gaps" })
    await expect(header).toBeVisible()

    // Initially collapsed — description not visible in sidebar
    await expect(
      sidebar.getByText("Close care gaps for attributed members", { exact: false }),
    ).not.toBeVisible()

    // Expand
    await header.click()
    await expect(
      sidebar.getByText("Close care gaps for attributed members", { exact: false }),
    ).toBeVisible()

    // Collapse
    await header.click()
    await expect(
      sidebar.getByText("Close care gaps for attributed members", { exact: false }),
    ).not.toBeVisible()
  })

  test('"Also try" example sends query', async ({ page }) => {
    await page.goto("/")

    // Expand "Care Gaps" workflow
    await page.getByRole("button", { name: "Care Gaps" }).click()

    // Click an "Also try" example
    await page
      .getByRole("button", { name: "Patients with diabetes AND HbA1c > 9" })
      .click()

    // Query should appear in the query display
    await expect(page.getByTestId("query-display")).toHaveText(
      "Patients with diabetes AND HbA1c > 9",
    )
  })

  test("data gaps display for workflows with gaps", async ({ page }) => {
    await page.goto("/")

    const sidebar = page.locator("aside")

    // Expand "Utilization & Costs"
    await sidebar.getByRole("button", { name: "Utilization & Costs" }).click()

    // Verify gap text is visible in sidebar
    await expect(
      sidebar.getByText("No Claim/ExplanationOfBenefit resources", {
        exact: false,
      }),
    ).toBeVisible()
    await expect(
      sidebar.getByText("No ServiceRequest resources", { exact: false }),
    ).toBeVisible()
  })

  test("sidebar disabled during streaming", async ({ page }) => {
    await page.goto("/")

    const scenarioBtn = page.getByTestId("scenario-member-insurance")
    await expect(scenarioBtn).toBeEnabled()

    // Click scenario to start streaming
    await scenarioBtn.click()

    // Immediately check that scenario buttons are disabled
    await expect(scenarioBtn).toBeDisabled()
    await expect(page.getByTestId("scenario-gaps-metformin")).toBeDisabled()
    await expect(page.getByTestId("custom-input")).toBeDisabled()

    // Wait for response to complete
    await expect(page.getByTestId("confidence-badge")).toBeVisible({
      timeout: 120_000,
    })

    // Buttons should be re-enabled
    await expect(scenarioBtn).toBeEnabled()
    await expect(page.getByTestId("custom-input")).toBeEnabled()
  })

  test("partial badge visible on workflows with gaps", async ({ page }) => {
    await page.goto("/")

    // Scope to the sidebar to avoid matching main area badges
    const sidebar = page.locator("aside")

    // Workflows with gaps should show "partial" badge in the sidebar
    const partialBadges = sidebar.getByText("partial", { exact: true })
    await expect(partialBadges).toHaveCount(4)

    // Verify the four workflows with gaps have the badge
    for (const label of [
      "Quality & Performance",
      "Utilization & Costs",
      "Membership & Attribution",
      "Reconciliation & Export",
    ]) {
      const header = sidebar.getByRole("button", { name: label })
      await expect(header.getByText("partial")).toBeVisible()
    }

    // Workflows without gaps should not have the badge
    for (const label of ["Care Gaps", "Patient History & Continuity"]) {
      const header = sidebar.getByRole("button", { name: label })
      await expect(header.getByText("partial")).not.toBeVisible()
    }
  })
})
