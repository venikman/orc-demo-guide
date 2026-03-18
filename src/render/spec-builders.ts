import type { AgentResponse } from "@/client/types.ts"
import type { Workflow } from "@/client/scenarios.ts"
import { node, type RenderTreeNode } from "./types.ts"

const text = (content: string, variant: "body" | "lead" | "muted" | "caption" | "code" = "body") =>
  node("Text", { text: content, variant })

const badge = (content: string, variant: "default" | "secondary" | "destructive" | "outline" = "outline") =>
  node("Badge", { text: content, variant })

const panel = (
  title: string | null,
  options: {
    eyebrow?: string
    testId?: string
    tone?: "default" | "accent" | "muted"
    size?: "default" | "compact"
  } = {},
  children: RenderTreeNode[] = [],
) =>
  node(
    "Panel",
    {
      title,
      eyebrow: options.eyebrow ?? null,
      testId: options.testId ?? null,
      tone: options.tone ?? "default",
      size: options.size ?? "default",
    },
    children,
  )

export function buildIdleSpec(workflows: Workflow[]): RenderTreeNode {
  return node(
    "Stack",
    { direction: "vertical", gap: "sm" },
    [
      node("Heading", {
        text: "Ask the data",
        level: "h2",
      }),
      text(
        `Pick a lane or type below. ${workflows.length} lanes stay available while the center stays focused on the active chat.`,
        "lead",
      ),
      text("Explainability stays off-canvas until you open it.", "muted"),
    ],
  )
}

export function buildPendingSpec(query: string): RenderTreeNode {
  return node(
    "Stack",
    { direction: "vertical", gap: "md" },
    [
      panel(
        "Working",
        { eyebrow: "In progress", testId: "pending-state", tone: "default", size: "compact" },
        [
          text(query, "body"),
          text("Waiting for the final response over plain HTTP.", "muted"),
        ],
      ),
    ],
  )
}

export function buildCompletedSpec(response: AgentResponse): RenderTreeNode {
  return node(
    "Stack",
    { direction: "vertical", gap: "md" },
    [
      panel(
        "Answer",
        { eyebrow: "Final answer", testId: "response-content", tone: "default" },
        [
          node("Stack", { direction: "horizontal", gap: "sm" }, [
            badge(response.agentUsed, "outline"),
            badge(response.confidence, "secondary"),
          ]),
          text(`Answered by the ${response.agentUsed} agent with ${response.confidence} confidence.`, "muted"),
          node("MarkdownAnswer", { content: response.answer, testId: null }),
        ],
      ),
    ],
  )
}

export function buildWorkflowBriefSpec(workflow: Workflow): RenderTreeNode | null {
  if (workflow.gaps.length === 0) return null

  return node(
    "Stack",
    { direction: "vertical", gap: "md" },
    [
      panel(
        "Known limits",
        { eyebrow: workflow.label, testId: "workflow-brief", tone: "default", size: "compact" },
        [
          node(
            "Stack",
            { direction: "vertical", gap: "sm" },
            workflow.gaps.map((gap) => text(gap, "body")),
          ),
        ],
      ),
    ],
  )
}

export function buildInspectorSpec(response: AgentResponse): RenderTreeNode {
  const citationBadges =
    response.citations.length > 0
      ? response.citations.map((citation) =>
          text(`${citation.resourceType}/${citation.id}`, "body"),
        )
      : [text("No citations were returned for this answer.", "muted")]

  const reasoningItems =
    response.reasoning.length > 0
      ? response.reasoning.map((step, index) => text(`${index + 1}. ${step}`, "body"))
      : [text("No reasoning trace was returned.", "muted")]

  const toolBadges =
    response.toolsUsed.length > 0
      ? response.toolsUsed.map((tool) => text(tool, "body"))
      : [text("No tools were recorded for this answer.", "muted")]

  return node(
    "Stack",
    { direction: "vertical", gap: "md" },
    [
      panel(
        "Tools",
        { eyebrow: "Execution", testId: "tools-used", tone: "default" },
        [node("Stack", { direction: "vertical", gap: "sm" }, toolBadges)],
      ),
      panel(
        "Reasoning",
        { eyebrow: "Trace", testId: "reasoning", tone: "default" },
        [node("Stack", { direction: "vertical", gap: "sm" }, reasoningItems)],
      ),
      panel(
        `Citations (${response.citations.length})`,
        { eyebrow: "Sources", testId: "citations", tone: "default" },
        [node("Stack", { direction: "vertical", gap: "sm" }, citationBadges)],
      ),
    ],
  )
}

export function buildErrorSpec(message: string): RenderTreeNode {
  return node("Alert", {
    title: "Request failed",
    message,
    type: "error",
  })
}
