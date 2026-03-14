import type {
  DemoSessionPreset,
  SearchFilter,
  SearchMatch,
  SearchPlan,
  SearchRequestEnvelope,
  TraceStep,
} from "../../../validation-schema";

export const SOURCE_COUNT = 3;
export const PREVIEW_COUNT = 3;

/**
 * Creates the typed request envelope used by deterministic retrieval.
 */
export function buildRequestEnvelope(
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

/**
 * Produces deterministic demo latency values for each plan status.
 */
export function formatLatency(planStatus: SearchPlan["status"]) {
  if (planStatus === "deny") {
    return 96;
  }

  if (planStatus === "clarify") {
    return 118;
  }

  return 340;
}

/**
 * Builds the trace artifact rendered in the client flow panel.
 */
export function buildTrace(prompt: string, plan: SearchPlan, totalResults: number): TraceStep[] {
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

/**
 * Applies a single search filter to a member card.
 */
export function matchesFilter(match: SearchMatch, filter: SearchFilter) {
  const lowerValue = filter.value.toLowerCase();
  const locationAliases: Record<string, string[]> = {
    "site-4021": ["springfield clinic", "springfield", "springfield family medicine"],
    "site-1108": ["north campus", "north campus primary care", "north clinic"],
  };

  if (filter.type === "condition") {
    return (match.conditions ?? []).some(
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
      (locationAliases[match.siteId] ?? []).some(
        (alias) => alias.includes(lowerValue) || lowerValue.includes(alias),
      )
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

/**
 * Restricts synthetic matches to the preset's allowed sites and providers.
 */
export function enforcePresetScope(matches: SearchMatch[], preset: DemoSessionPreset) {
  return matches.filter(
    (match) =>
      preset.allowedSiteIds.includes(match.siteId) &&
      preset.allowedProviders.includes(match.provider),
  );
}
