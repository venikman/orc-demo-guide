import type {
  DemoSessionPreset,
  SearchFilter,
  SearchPlan,
  SearchRequestEnvelope,
  TraceStep,
} from "../../../validation-schema";
import type { PublicEncounterRecord } from "./public-dataset";

export const SOURCE_COUNT = 5;
export const PREVIEW_COUNT = 3;
const FILLER_TOKENS = new Set(["a", "an", "at", "for", "in", "of", "on", "the", "to"]);

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeSearchPhrase(value: string, stripFillers = false) {
  const tokens = normalizeText(value)
    .split(" ")
    .filter(Boolean);

  return (stripFillers ? tokens.filter((token) => !FILLER_TOKENS.has(token)) : tokens).join(" ");
}

function matchesCandidate(
  candidate: string | null | undefined,
  searchValues: string[],
  stripFillers = false,
) {
  if (!candidate) {
    return false;
  }

  const normalizedCandidate = normalizeSearchPhrase(candidate, stripFillers);
  if (!normalizedCandidate) {
    return false;
  }

  return searchValues.some((searchValue) => {
    const normalizedSearch = normalizeSearchPhrase(searchValue, stripFillers);
    if (!normalizedSearch) {
      return false;
    }

    return (
      normalizedCandidate.includes(normalizedSearch) ||
      normalizedSearch.includes(normalizedCandidate)
    );
  });
}

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

  const encounterFilter = plan.filters.find((filter) => filter.type === "encounter");
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
      description: `"${conditionFilter?.value ?? "condition"}" mapped to public diagnosis codes`,
      detail: `Condition text is matched against de-identified diagnosis labels and ICD codes from the public FHIR snapshot.`,
      timeLabel: "82 ms",
      state: "done",
    },
    {
      id: "scope",
      title: "Resolve scope",
      agent: "Scope resolver",
      agentTone: "teal",
      description: `"${locationFilter?.value ?? "location"}" resolved within the preset's allowed encounter scope`,
      detail: `Trusted role scope is intersected with the requested FHIR location before retrieval. Encounter detail: ${encounterFilter?.value ?? "not requested"}.`,
      timeLabel: "91 ms",
      state: "done",
    },
    {
      id: "query",
      title: "Execute deterministic retrieval",
      agent: "Query engine",
      agentTone: "blue",
      description: `Encounter index queried with all active filters intersected, returned ${totalResults} matches`,
      detail: "The retrieval engine performs set intersection only. The LLM does not decide membership.",
      timeLabel: "240 ms",
      state: "done",
    },
    {
      id: "validate",
      title: "Validate evidence",
      agent: "Explanation builder",
      agentTone: "coral",
      description: `${totalResults}/${totalResults} results retained after evidence and provenance checks`,
      detail: "Each result is checked for visible de-identified evidence, encounter provenance, and source labels.",
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
          sources_used: ["Patient", "Condition", "Encounter", "Location", "Organization"],
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
 * Applies a single search filter to a normalized public encounter record.
 */
export function matchesFilter(record: PublicEncounterRecord, filter: SearchFilter) {
  const searchValues = [filter.canonicalValue, filter.value].filter(
    (value): value is string => Boolean(value?.trim()),
  );

  if (filter.type === "condition") {
    return record.conditions.some(
      (condition) =>
        matchesCandidate(condition.label, searchValues) ||
        matchesCandidate(condition.code, searchValues) ||
        condition.aliases.some((alias) => matchesCandidate(alias, searchValues)),
    );
  }

  if (filter.type === "location") {
    return (
      matchesCandidate(record.locationName, searchValues, true) ||
      matchesCandidate(record.locationId, searchValues, true) ||
      matchesCandidate(record.organizationName, searchValues, true)
    );
  }

  if (filter.type === "encounter") {
    return (
      matchesCandidate(record.encounterLabel, searchValues) ||
      matchesCandidate(record.encounterClass, searchValues) ||
      matchesCandidate(record.encounterService, searchValues)
    );
  }

  return true;
}

/**
 * Restricts normalized encounter records to the preset's allowed organizations and locations.
 */
export function enforcePresetScope(records: PublicEncounterRecord[], preset: DemoSessionPreset) {
  return records.filter(
    (record) =>
      preset.allowedOrganizationNames.includes(record.organizationName) &&
      preset.allowedLocationNames.includes(record.locationName),
  );
}
