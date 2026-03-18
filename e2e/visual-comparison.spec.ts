import { expect, test, type Page } from "@playwright/test"
import { expandWorkflowForScenario, mockCopilotApi } from "./support/copilot.ts"

const REFERENCE_URL =
  process.env.SHADCN_REFERENCE_URL ??
  "https://ui.shadcn.com/create?preset=avko5a4&base=base"

type StyleSample = {
  selector: string
  text: string
  backgroundColor: string
  color: string
  borderRadius: string
  borderColor: string
  borderWidth: string
  boxShadow: string
  fontFamily: string
  fontSize: string
  fontWeight: string
  lineHeight: string
} | null

type VisualSummary = {
  body: StyleSample
  elements: StyleSample[]
}

type ViewportMetrics = {
  innerWidth: number
  innerHeight: number
  scrollWidth: number
  scrollHeight: number
  canScrollX: boolean
  canScrollY: boolean
}

async function collectVisualSummary(page: Page, selectors: string[]): Promise<VisualSummary> {
  return page.evaluate((summarySelectors) => {
    const sample = (selector: string) => {
      const element = document.querySelector(selector)
      if (!element) return null

      const style = getComputedStyle(element)

      return {
        selector,
        text: element.textContent?.trim().slice(0, 120) ?? "",
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderRadius: style.borderRadius,
        borderColor: style.borderColor,
        borderWidth: style.borderWidth,
        boxShadow: style.boxShadow,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
      }
    }

    return {
      body: sample("body"),
      elements: summarySelectors.map(sample),
    }
  }, selectors)
}

async function collectViewportMetrics(page: Page): Promise<ViewportMetrics> {
  return page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    canScrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    canScrollY: document.documentElement.scrollHeight > document.documentElement.clientHeight,
  }))
}

test.describe("Visual Comparison Harness", () => {
  test.skip(
    !process.env.PLAYWRIGHT_SHADCN_COMPARE,
    "Run explicitly via `npm run test:e2e:compare` because it depends on a live shadcn reference page.",
  )

  test("captures the idle shell beside the shadcn reference page", async ({
    page,
    browser,
  }, testInfo) => {
    test.slow()

    await mockCopilotApi(page)
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.goto("/")

    await expect(page.getByTestId("workflow-rail")).toBeVisible()
    await expect(page.getByTestId("chat-composer")).toBeVisible()

    const referenceContext = await browser.newContext({
      viewport: { width: 1600, height: 900 },
    })

    try {
      const referencePage = await referenceContext.newPage()
      await referencePage.goto(REFERENCE_URL, { waitUntil: "domcontentloaded" })
      await expect(referencePage.getByRole("dialog")).toBeVisible({ timeout: 30_000 })

      const appSummary = await collectVisualSummary(page, [
        '[data-testid="workflow-rail"]',
        '[data-testid="workflow-rail"] button',
        '[data-testid="chat-composer"]',
        '[data-testid="send-button"]',
      ])
      const referenceSummary = await collectVisualSummary(referencePage, [
        '[role="dialog"]',
        '[role="dialog"] button',
        "nav",
      ])
      const appViewport = await collectViewportMetrics(page)

      const appIdlePath = testInfo.outputPath("app-idle.jpg")
      const referencePath = testInfo.outputPath("shadcn-reference.jpg")

      await page.screenshot({ path: appIdlePath, type: "jpeg", quality: 85 })
      await referencePage.screenshot({ path: referencePath, type: "jpeg", quality: 85 })

      await testInfo.attach("app-idle", {
        path: appIdlePath,
        contentType: "image/jpeg",
      })
      await testInfo.attach("shadcn-reference", {
        path: referencePath,
        contentType: "image/jpeg",
      })
      await testInfo.attach("comparison-summary", {
        body: Buffer.from(
          JSON.stringify(
            {
              appViewport,
              appSummary,
              referenceSummary,
              referenceUrl: REFERENCE_URL,
            },
            null,
            2,
          ),
        ),
        contentType: "application/json",
      })

      expect(appViewport.canScrollX).toBe(false)
      expect(appSummary.body?.fontFamily.toLowerCase()).toContain("geist")
      expect(referenceSummary.body?.fontFamily.toLowerCase()).toContain("geist")
      expect(appSummary.elements[3]?.borderRadius).toBe(referenceSummary.elements[1]?.borderRadius)
      expect(referenceSummary.elements[1]?.text).toContain("Get Started")
    } finally {
      await referenceContext.close()
    }
  })

  test("captures the answered + inspector-open shell for manual review", async ({
    page,
  }, testInfo) => {
    await mockCopilotApi(page)
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.goto("/")

    await expandWorkflowForScenario(page, "util-encounters")
    await page.getByTestId("scenario-util-encounters").click()
    await page.getByTestId("inspector-toggle").click()

    await expect(page.getByTestId("inspector-panel")).toBeVisible()

    const appViewport = await collectViewportMetrics(page)
    const panelBox = await page.getByTestId("inspector-panel").boundingBox()
    const railBox = await page.getByTestId("workflow-rail").boundingBox()
    const composerBox = await page.getByTestId("chat-composer").boundingBox()

    const answeredPath = testInfo.outputPath("app-answered-inspector.jpg")
    await page.screenshot({ path: answeredPath, type: "jpeg", quality: 85 })

    await testInfo.attach("app-answered-inspector", {
      path: answeredPath,
      contentType: "image/jpeg",
    })
    await testInfo.attach("app-answered-metrics", {
      body: Buffer.from(
        JSON.stringify(
          {
            appViewport,
            railBox,
            composerBox,
            panelBox,
          },
          null,
          2,
        ),
      ),
      contentType: "application/json",
    })

    expect(appViewport.canScrollX).toBe(false)
    expect(appViewport.canScrollY).toBe(false)
    expect(railBox).not.toBeNull()
    expect(composerBox).not.toBeNull()
    expect(panelBox).not.toBeNull()
    expect(railBox!.width).toBeLessThanOrEqual(264)
    expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(900)
    expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(1600)
    expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(900)
  })
})
