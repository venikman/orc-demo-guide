import { describe, expect, test } from "vite-plus/test";
import type { AgentResponse } from "@/client/types.ts";
import {
  buildCompletedSpec,
  buildErrorSpec,
  buildInspectorSpec,
  buildIdleSpec,
  buildPendingSpec,
  buildWorkflowBriefSpec,
} from "./spec-builders.ts";

const workflows = [
  {
    id: "care-gaps",
    label: "Care Gaps",
    description: "Close quality gaps across the attributed panel.",
    scenarios: [
      {
        id: "gap-1",
        agent: "cohort" as const,
        query: "Patients with diabetes and no recent HbA1c observation",
      },
    ],
    examples: ["Patients with diabetes AND HbA1c > 9"],
    gaps: [],
  },
];

const response: AgentResponse = {
  answer: "A final synthesized answer",
  agentUsed: "clinical",
  citations: [{ resourceType: "Patient", id: "patient-0001" }],
  confidence: "high",
  reasoning: ["Step one", "Step two"],
  toolsUsed: ["fhir_search_patients", "fhir_read_resource"],
};

describe("copilot spec builders", () => {
  test("buildIdleSpec keeps the center shell minimal", () => {
    const spec = buildIdleSpec(workflows);

    expect(spec.component).toBe("Stack");
    expect(spec.children.some((child) => child.component === "Heading")).toBe(true);
    expect(spec.children.some((child) => child.component === "Card")).toBe(false);
    expect(JSON.stringify(spec)).not.toContain("Care Gaps");
    expect(JSON.stringify(spec)).toContain("Pick a lane");
  });

  test("buildPendingSpec reflects the active query", () => {
    const spec = buildPendingSpec("What insurance does patient-0001 have?");

    expect(spec.component).toBe("Stack");
    expect(JSON.stringify(spec)).toContain("What insurance does patient-0001 have?");
    expect(JSON.stringify(spec)).toContain("Working");
  });

  test("buildCompletedSpec only exposes answer metadata and transcript content", () => {
    const spec = buildCompletedSpec(response);

    expect(spec.component).toBe("Stack");
    expect(JSON.stringify(spec)).toContain("clinical");
    expect(JSON.stringify(spec)).toContain("high");
    expect(JSON.stringify(spec)).not.toContain("fhir_search_patients");
    expect(JSON.stringify(spec)).not.toContain("patient-0001");
  });

  test("buildInspectorSpec groups reasoning, tools, and citations separately from the chat", () => {
    const spec = buildInspectorSpec(response);

    expect(spec.component).toBe("Stack");
    expect(JSON.stringify(spec)).toContain("fhir_search_patients");
    expect(JSON.stringify(spec)).toContain("patient-0001");
    expect(JSON.stringify(spec)).toContain("Trace");
    expect(JSON.stringify(spec)).toContain("Execution");
    expect(JSON.stringify(spec)).toContain("Sources");
  });

  test("buildWorkflowBriefSpec surfaces lane limits in the chat instead of the rail", () => {
    const spec = buildWorkflowBriefSpec({
      ...workflows[0],
      label: "Utilization & Costs",
      gaps: [
        "No Claim/ExplanationOfBenefit resources — cannot compute actual costs or PMPM",
        "No ServiceRequest resources — cannot track referrals to specialists",
      ],
    });

    expect(spec).not.toBeNull();
    expect(JSON.stringify(spec)).toContain("Utilization & Costs");
    expect(JSON.stringify(spec)).toContain("No Claim/ExplanationOfBenefit resources");
    expect(JSON.stringify(spec)).toContain("Known limits");
  });

  test("buildErrorSpec returns a recoverable alert block", () => {
    const spec = buildErrorSpec("Request failed");

    expect(spec.component).toBe("Alert");
    expect(JSON.stringify(spec)).toContain("Request failed");
  });
});
