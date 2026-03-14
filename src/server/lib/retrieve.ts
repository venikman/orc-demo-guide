import type {
  AiUsage,
  DataFlowStage,
  DemoSessionPreset,
  SearchMonitoring,
  SearchPlan,
  SearchResponseEnvelope,
  SearchSourceMode,
  SearchTransportMode,
} from "../../../validation-schema";
import { writeAuditEvent } from "./audit";
import { applyFieldVisibility } from "./field-visibility";
import { logEvent } from "./logging";
import { buildPolicyDecision } from "./policy";
import {
  buildSearchMatch,
  getPublicDatasetRecords,
  getPublicDatasetSourceCount,
} from "./public-dataset";
import {
  buildRequestEnvelope,
  buildTrace,
  enforcePresetScope,
  formatLatency,
  matchesFilter,
  PREVIEW_COUNT,
  SOURCE_COUNT,
} from "./retrieve-helpers";

type ResponseWithoutPolicy = Omit<SearchResponseEnvelope, "policyDecision">;

type SearchExecutionContext = {
  requestId: string;
  sourceMode: SearchSourceMode;
  modelUsed?: string;
  aiUsage: AiUsage;
  transport: SearchTransportMode;
  threadId?: string;
};

type SearchCounts = {
  scoped: number;
  filtered: number;
  visible: number;
};

function buildTransportDetail(transport: SearchTransportMode) {
  return transport === "use_stream"
    ? "Streamed to the client through LangChain useStream over the SSE search endpoint."
    : "Returned through the request-reply JSON search endpoint.";
}

function buildSuccessDataFlow(
  plan: SearchPlan,
  counts: SearchCounts,
  transport: SearchTransportMode,
): DataFlowStage[] {
  return [
    {
      id: "intake",
      title: "Prompt intake",
      detail: "Natural-language cohort request received and bound to the active preset scope.",
      countLabel: "1 prompt",
    },
    {
      id: "planning",
      title: "AI planning",
      detail: "LangChain createAgent compiled the prompt into a structured cohort search plan.",
      countLabel: `${plan.filters.length} filters`,
    },
    {
      id: "scope",
      title: "Scoped dataset",
      detail: "The normalized public FHIR encounter index was reduced to the preset's allowed locations and organizations.",
      countLabel: `${counts.scoped} scoped encounters`,
    },
    {
      id: "retrieval",
      title: "Deterministic retrieval",
      detail: "Condition, location, and encounter filters were intersected against the scoped encounter records.",
      countLabel: `${counts.filtered} matched encounters`,
    },
    {
      id: "visibility",
      title: "Field visibility",
      detail: "Role-based field rules were applied after retrieval so only the permitted payload remains.",
      countLabel: `${counts.visible} visible encounters`,
    },
    {
      id: "delivery",
      title: "Client delivery",
      detail: buildTransportDetail(transport),
      countLabel: `${Math.min(counts.visible, PREVIEW_COUNT)}/${counts.visible} preview rows`,
    },
  ];
}

function buildClarifyDataFlow(
  plan: SearchPlan,
  transport: SearchTransportMode,
): DataFlowStage[] {
  return [
    {
      id: "intake",
      title: "Prompt intake",
      detail: "Natural-language cohort request received and bound to the active preset scope.",
      countLabel: "1 prompt",
    },
    {
      id: "planning",
      title: "AI planning",
      detail: "LangChain createAgent extracted the available filters and detected missing search requirements.",
      countLabel: `${plan.filters.length} filters`,
    },
    {
      id: "clarify",
      title: "Clarification gate",
      detail: `Retrieval halted until the missing fields are provided: ${plan.missingFields.join(", ")}.`,
      countLabel: transport === "use_stream" ? "stream update" : "json response",
    },
  ];
}

function buildDenyDataFlow(transport: SearchTransportMode): DataFlowStage[] {
  return [
    {
      id: "intake",
      title: "Prompt intake",
      detail: "Natural-language request received before any cohort retrieval work began.",
      countLabel: "1 prompt",
    },
    {
      id: "planning",
      title: "AI planning",
      detail: "LangChain createAgent classified the request as unsupported for read-only cohort retrieval.",
      countLabel: "safety stop",
    },
    {
      id: "policy",
      title: "Policy stop",
      detail: buildTransportDetail(transport),
      countLabel: "0 records moved",
    },
  ];
}

function buildMonitoring(
  plan: SearchPlan,
  context: SearchExecutionContext,
  counts: SearchCounts,
): SearchMonitoring {
  return {
    aiUsage: {
      ...context.aiUsage,
      transport: context.transport,
      threadId: context.threadId ?? context.aiUsage.threadId,
    },
    dataFlow:
      plan.status === "ready"
        ? buildSuccessDataFlow(plan, counts, context.transport)
        : plan.status === "clarify"
          ? buildClarifyDataFlow(plan, context.transport)
          : buildDenyDataFlow(context.transport),
  };
}

function finalizeResponse(
  requestId: string,
  preset: DemoSessionPreset,
  response: ResponseWithoutPolicy,
): SearchResponseEnvelope {
  const finalizedResponse: SearchResponseEnvelope = {
    ...response,
    policyDecision: buildPolicyDecision(requestId, preset, response as SearchResponseEnvelope),
  };

  writeAuditEvent({
    requestId,
    preset,
    outcome: finalizedResponse.status,
    sourceMode: finalizedResponse.sourceMode,
    modelUsed: finalizedResponse.modelUsed,
    detail: {
      matched: finalizedResponse.totalResults,
      latency_ms: finalizedResponse.stats.latencyMs,
      monitoring: finalizedResponse.monitoring,
    },
  });

  return finalizedResponse;
}

/**
 * Executes the read-only deterministic member search for the current preset.
 */
export function executeSearch(
  prompt: string,
  preset: DemoSessionPreset,
  plan: SearchPlan,
  context: SearchExecutionContext,
): SearchResponseEnvelope {
  const request = buildRequestEnvelope(context.requestId, prompt, preset, plan);
  const latencyMs = formatLatency(plan.status);

  if (plan.status === "deny") {
    return finalizeResponse(request.request_id, preset, {
      requestId: request.request_id,
      status: "deny",
      sourceMode: context.sourceMode,
      modelUsed: context.modelUsed,
      prompt,
      presetId: preset.id,
      plan,
      interpretedSummary: plan.denialReason ?? "Request denied by the prototype safety policy.",
      stats: { matched: 0, sources: SOURCE_COUNT, latencyMs },
      chips: [],
      trace: buildTrace(prompt, plan, 0),
      results: [],
      totalResults: 0,
      previewCount: PREVIEW_COUNT,
      denialReason: plan.denialReason ?? "Unsupported request.",
      monitoring: buildMonitoring(plan, context, {
        scoped: 0,
        filtered: 0,
        visible: 0,
      }),
    });
  }

  if (plan.status === "clarify") {
    return finalizeResponse(request.request_id, preset, {
      requestId: request.request_id,
      status: "clarify",
      sourceMode: context.sourceMode,
      modelUsed: context.modelUsed,
      prompt,
      presetId: preset.id,
      plan,
      interpretedSummary: plan.clarificationQuestion ?? "One more detail is needed before retrieval.",
      stats: { matched: 0, sources: SOURCE_COUNT, latencyMs },
      chips: plan.filters.map((filter) => filter.type),
      trace: buildTrace(prompt, plan, 0),
      results: [],
      totalResults: 0,
      previewCount: PREVIEW_COUNT,
      clarificationQuestion: plan.clarificationQuestion,
      monitoring: buildMonitoring(plan, context, {
        scoped: 0,
        filtered: 0,
        visible: 0,
      }),
    });
  }

  const scopedRecords = enforcePresetScope(getPublicDatasetRecords(), preset);
  logEvent("retrieval.request", {
    request_id: request.request_id,
    role: preset.requester.role,
    filters: plan.filters,
    scoped_candidates: scopedRecords.length,
  });

  const filteredRecords = plan.filters.reduce(
    (current, filter) => current.filter((record) => matchesFilter(record, filter)),
    scopedRecords,
  );
  const filteredMatches = filteredRecords.map((record) => buildSearchMatch(record, plan));
  const visibleMatches = applyFieldVisibility(filteredMatches, preset.requester.role);

  logEvent("retrieval.response", {
    request_id: request.request_id,
    matched: visibleMatches.length,
    preview_names: visibleMatches.slice(0, PREVIEW_COUNT).map((result) => result.name),
  });

  return finalizeResponse(request.request_id, preset, {
    requestId: request.request_id,
    status: "success",
    sourceMode: context.sourceMode,
    modelUsed: context.modelUsed,
    prompt,
    presetId: preset.id,
    plan,
    interpretedSummary: plan.summary ?? "Natural-language query compiled into deterministic cohort filters.",
    stats: {
      matched: visibleMatches.length,
      sources: getPublicDatasetSourceCount(),
      latencyMs,
    },
    chips: plan.filters.map((filter) => filter.type),
    trace: buildTrace(prompt, plan, visibleMatches.length),
    results: visibleMatches,
    totalResults: visibleMatches.length,
    previewCount: PREVIEW_COUNT,
    monitoring: buildMonitoring(plan, context, {
      scoped: scopedRecords.length,
      filtered: filteredRecords.length,
      visible: visibleMatches.length,
    }),
  });
}
