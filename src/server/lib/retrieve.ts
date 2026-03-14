import type {
  DemoSessionPreset,
  SearchFilter,
  SearchMatch,
  SearchPlan,
  SearchRequestEnvelope,
  SearchResponseEnvelope,
  TraceStep,
} from "../../../validation-schema";
import { getSyntheticMatches } from "../data/fixtures";
import { logEvent } from "./logging";

type ExecuteResult = SearchResponseEnvelope;

const SOURCE_COUNT = 3;
const PREVIEW_COUNT = 3;

function buildRequestEnvelope(
  requestId: string,
  prompt: string,
  preset: DemoSessionPreset,
  plan: SearchPlan,
): SearchRequestEnvelope {
  return {
    request_id: requestId,
    created_at: new Date().toISOString(),
    raw_user_text: prompt,
    request: {
      capability: "cohort_search",
      filters: plan.filters,
      output: {
        mode: "cards",
        max_results: PREVIEW_COUNT,
      },
      clarification: {
        needed: plan.status === "clarify",
        missing_fields: plan.missingFields.length > 0 ? plan.missingFields : undefined,
      },
    },
    trusted_context: {
      requester: preset.requester,
      purpose_of_use: preset.purpose_of_use,
      smart_scopes: preset.smart_scopes,
      field_visibility_profile_id: preset.field_visibility_profile_id,
      phase: "read_only_v1",
    },
  };
}

function formatLatency(planStatus: SearchPlan["status"]) {
  if (planStatus === "deny") {
    return 96;
  }

  if (planStatus === "clarify") {
    return 118;
  }

  return 340;
}

function buildTrace(prompt: string, plan: SearchPlan, totalResults: number): TraceStep[] {
  if (plan.status === "deny") {
    return [
      {
        id: "receive",
        title: "Receive natural language",
        agent: "Manager agent",
        agentTone: "purple",
        description: `User typed: "${prompt}"`,
        detail: "The request is evaluated before retrieval begins.",
        timeLabel: "0 ms",
        state: "done",
      },
      {
        id: "policy",
        title: "Apply safety gate",
        agent: "Manager agent",
        agentTone: "coral",
        description: plan.denialReason ?? "Request refused by safety policy.",
        detail: "Unsupported medical-advice and instruction-override requests are blocked before any cohort search executes.",
        timeLabel: "96 ms",
        state: "active",
      },
    ];
  }

  if (plan.status === "clarify") {
    return [
      {
        id: "receive",
        title: "Receive natural language",
        agent: "Manager agent",
        agentTone: "purple",
        description: `User typed: "${prompt}"`,
        detail: "The request is inspected as entered, without rewriting the prompt.",
        timeLabel: "0 ms",
        state: "done",
      },
      {
        id: "parse",
        title: "Parse intent into SearchRequest",
        agent: "Manager agent",
        agentTone: "purple",
        description: `Detected ${plan.filters.length} candidate filter${plan.filters.length === 1 ? "" : "s"}`,
        detail: JSON.stringify({ intent: plan.intent, filters: plan.filters }, null, 2),
        timeLabel: "45 ms",
        state: "done",
      },
      {
        id: "clarify",
        title: "Request clarification",
        agent: "Scope resolver",
        agentTone: "teal",
        description: plan.clarificationQuestion ?? "The query needs one more detail before retrieval.",
        detail: `Missing fields: ${plan.missingFields.join(", ")}`,
        timeLabel: "118 ms",
        state: "active",
      },
    ];
  }

  const appointmentFilter = plan.filters.find((filter) => filter.type === "appointment");
  const locationFilter = plan.filters.find((filter) => filter.type === "location");
  const conditionFilter = plan.filters.find((filter) => filter.type === "condition");

  return [
    {
      id: "receive",
      title: "Receive natural language",
      agent: "Manager agent",
      agentTone: "purple",
      description: `User typed: "${prompt}"`,
      detail: "Raw text passed to the manager agent. No preprocessing; the query remains intact.",
      timeLabel: "0 ms",
      state: "done",
    },
    {
      id: "parse",
      title: "Parse intent into SearchRequest",
      agent: "Manager agent",
      agentTone: "purple",
      description: `Extracted ${plan.filters.length} filters: ${plan.filters.map((filter) => filter.type).join(", ")}`,
      detail: JSON.stringify(
        {
          intent: plan.intent,
          filters: plan.filters,
          output_mode: plan.outputMode,
        },
        null,
        2,
      ),
      timeLabel: "45 ms",
      state: "done",
    },
    {
      id: "terms",
      title: "Resolve clinical terms",
      agent: "Term resolver",
      agentTone: "teal",
      description: `"${conditionFilter?.value ?? "condition"}" mapped to an approved concept set`,
      detail: `"${conditionFilter?.value ?? "condition"}" -> concept_set from the approved diabetes map. Unsupported terms trigger clarification instead of approximation.`,
      timeLabel: "82 ms",
      state: "done",
    },
    {
      id: "scope",
      title: "Resolve scope",
      agent: "Scope resolver",
      agentTone: "teal",
      description: `"${locationFilter?.value ?? "location"}" resolved within the preset's allowed clinic scope`,
      detail: `Trusted preset scope is intersected with the requested location before retrieval. Appointment window: ${appointmentFilter?.value ?? "n/a"}.`,
      timeLabel: "91 ms",
      state: "done",
    },
    {
      id: "query",
      title: "Execute deterministic retrieval",
      agent: "Query engine",
      agentTone: "blue",
      description: `Person index queried with all active filters intersected, returned ${totalResults} matches`,
      detail: "The retrieval engine performs set intersection only. The LLM does not decide membership.",
      timeLabel: "240 ms",
      state: "done",
    },
    {
      id: "validate",
      title: "Validate evidence",
      agent: "Explanation builder",
      agentTone: "coral",
      description: `${totalResults}/${totalResults} results retained after evidence and freshness checks`,
      detail: "Each result is checked for visible evidence, appointment freshness, and source provenance labels.",
      timeLabel: "305 ms",
      state: "done",
    },
    {
      id: "artifact",
      title: "Build ExplanationArtifact",
      agent: "Explanation builder",
      agentTone: "coral",
      description: "Each result card gets per-match reasons with source tags",
      detail: JSON.stringify(
        {
          interpreted_intent: plan.intent,
          filters_applied: plan.filters.length,
          sources_used: ["EHR", "Scheduling", "Payer"],
          match_count: totalResults,
          confidence: "high",
        },
        null,
        2,
      ),
      timeLabel: "340 ms",
      state: "active",
    },
  ];
}

function matchesFilter(match: SearchMatch, filter: SearchFilter) {
  const lowerValue = filter.value.toLowerCase();
  const locationAliases: Record<string, string[]> = {
    "site-4021": ["springfield clinic", "springfield", "springfield family medicine"],
    "site-1108": ["north campus", "north campus primary care", "north clinic"],
  };

  if (filter.type === "condition") {
    return match.conditions.some(
      (condition) =>
        condition.label.toLowerCase().includes(lowerValue) ||
        condition.code.toLowerCase().includes(lowerValue) ||
        condition.aliases.some((alias) => alias.toLowerCase().includes(lowerValue)),
    );
  }

  if (filter.type === "location") {
    return (
      match.siteName.toLowerCase().includes(lowerValue) ||
      match.siteId.toLowerCase().includes(lowerValue) ||
      (locationAliases[match.siteId] ?? []).some((alias) => alias.includes(lowerValue) || lowerValue.includes(alias))
    );
  }

  if (filter.type === "appointment") {
    return match.appointmentLabel.toLowerCase().includes(lowerValue) || lowerValue === "next tuesday";
  }

  if (filter.type === "payer") {
    return match.payer.toLowerCase().includes(lowerValue);
  }

  if (filter.type === "panel") {
    return match.provider.toLowerCase().includes(lowerValue);
  }

  return true;
}

function enforcePresetScope(matches: SearchMatch[], preset: DemoSessionPreset) {
  return matches.filter(
    (match) =>
      preset.allowedSiteIds.includes(match.siteId) &&
      preset.allowedProviders.includes(match.provider),
  );
}

function writeAuditEvent(envelope: SearchRequestEnvelope, response: SearchResponseEnvelope) {
  const audit = {
    request_id: envelope.request_id,
    created_at: envelope.created_at,
    role: envelope.trusted_context.requester.role,
    purpose_of_use: envelope.trusted_context.purpose_of_use,
    plan_status: response.status,
    source_mode: response.sourceMode,
    matched: response.totalResults,
    latency_ms: response.stats.latencyMs,
  };

  console.log("[audit]", JSON.stringify(audit));
}

export function executeSearch(
  prompt: string,
  preset: DemoSessionPreset,
  plan: SearchPlan,
  sourceMode: "gemini_api",
  requestId: string,
  modelUsed?: string,
): ExecuteResult {
  const request = buildRequestEnvelope(requestId, prompt, preset, plan);
  const latencyMs = formatLatency(plan.status);

  if (plan.status === "deny") {
    const response: SearchResponseEnvelope = {
      requestId: request.request_id,
      status: "deny",
      sourceMode,
      modelUsed,
      prompt,
      presetId: preset.id,
      interpretedSummary: plan.denialReason ?? "Request denied by the prototype safety policy.",
      stats: { matched: 0, sources: SOURCE_COUNT, latencyMs },
      chips: [],
      trace: buildTrace(prompt, plan, 0),
      results: [],
      totalResults: 0,
      previewCount: PREVIEW_COUNT,
      denialReason: plan.denialReason ?? "Unsupported request.",
    };
    writeAuditEvent(request, response);
    return response;
  }

  if (plan.status === "clarify") {
    const response: SearchResponseEnvelope = {
      requestId: request.request_id,
      status: "clarify",
      sourceMode,
      modelUsed,
      prompt,
      presetId: preset.id,
      interpretedSummary: plan.clarificationQuestion ?? "One more detail is needed before retrieval.",
      stats: { matched: 0, sources: SOURCE_COUNT, latencyMs },
      chips: plan.filters.map((filter) => filter.type),
      trace: buildTrace(prompt, plan, 0),
      results: [],
      totalResults: 0,
      previewCount: PREVIEW_COUNT,
      clarificationQuestion: plan.clarificationQuestion,
    };
    writeAuditEvent(request, response);
    return response;
  }

  const scopedMatches = enforcePresetScope(getSyntheticMatches(), preset);
  logEvent("retrieval.request", {
    request_id: request.request_id,
    role: preset.requester.role,
    filters: plan.filters,
    scoped_candidates: scopedMatches.length,
  });

  const filteredMatches = plan.filters.reduce<SearchMatch[]>(
    (current, filter) => current.filter((match) => matchesFilter(match, filter)),
    scopedMatches,
  );

  logEvent("retrieval.response", {
    request_id: request.request_id,
    matched: filteredMatches.length,
    preview_names: filteredMatches.slice(0, PREVIEW_COUNT).map((result) => result.name),
  });

  const response: SearchResponseEnvelope = {
    requestId: request.request_id,
    status: "success",
    sourceMode,
    modelUsed,
    prompt,
    presetId: preset.id,
    interpretedSummary: plan.summary ?? "Natural-language query compiled into deterministic cohort filters.",
    stats: {
      matched: filteredMatches.length,
      sources: SOURCE_COUNT,
      latencyMs,
    },
    chips: plan.filters.map((filter) => filter.type),
    trace: buildTrace(prompt, plan, filteredMatches.length),
    results: filteredMatches,
    totalResults: filteredMatches.length,
    previewCount: PREVIEW_COUNT,
  };

  writeAuditEvent(request, response);
  return response;
}
