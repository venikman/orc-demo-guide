import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vite-plus/test"

import { workflowLaneDotClasses, workflowRailClasses } from "./scenario-sidebar.tsx"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

describe("scenario sidebar visual tokens", () => {
  test("workflow dots use shared sidebar color tokens", () => {
    expect(workflowLaneDotClasses).toEqual({
      "care-gaps": "bg-[var(--workflow-care-gaps)]",
      quality: "bg-[var(--workflow-quality)]",
      utilization: "bg-[var(--workflow-utilization)]",
      membership: "bg-[var(--workflow-membership)]",
      clinical: "bg-[var(--workflow-clinical)]",
      reconciliation: "bg-[var(--workflow-reconciliation)]",
    })
  })

  test("partial badge uses muted bronze tokens", () => {
    expect(workflowRailClasses.partialBadge).toContain(
      "border-[var(--workflow-partial-border)]",
    )
    expect(workflowRailClasses.partialBadge).toContain("bg-[var(--workflow-partial-bg)]")
    expect(workflowRailClasses.partialBadge).toContain("text-[var(--workflow-partial-fg)]")

    const css = readFileSync(path.join(repoRoot, "src/index.css"), "utf8")
    expect(css).toContain("--workflow-partial-bg:")
    expect(css).toContain("--workflow-care-gaps:")
    expect(css).toContain("--workflow-reconciliation:")
  })
})
