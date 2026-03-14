import { Match, pipe } from "effect";

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
const ENCOUNTER_NOISE_TOKENS = new Set(["encounter", "encounters"]);

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenizeSearchPhrase(
  value: string,
  {
    stripFillers = false,
    ignoredTokens,
  }: {
    stripFillers?: boolean;
    ignoredTokens?: Set<string>;
  } = {},
) {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean)
    .filter((token) => {
      if (stripFillers && FILLER_TOKENS.has(token)) {
        return false;
      }

      return !ignoredTokens?.has(token);
    });
}

function normalizeSearchPhrase(value: string, stripFillers = false) {
  return tokenizeSearchPhrase(value, { stripFillers }).join(" ");
}

function hasTokenSequence(candidateTokens: string[], searchTokens: string[]) {
  if (!searchTokens.length || searchTokens.length > candidateTokens.length) {
    return false;
  }

  for (let startIndex = 0; startIndex <= candidateTokens.length - searchTokens.length; startIndex += 1) {
    let matched = true;

    for (let offset = 0; offset < searchTokens.length; offset += 1) {
      if (candidateTokens[startIndex + offset] !== searchTokens[offset]) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return true;
    }
  }

  return false;
}

function buildInitialism(tokens: string[]) {
  return tokens.length > 1 ? tokens.map((token) => token[0]).join("") : null;
}

function matchesTokenSequence(
  candidate: string | null | undefined,
  searchValues: string[],
  {
    stripFillers = false,
    ignoredTokens,
    allowInitialism = false,
    minimumSearchTokens = 1,
  }: {
    stripFillers?: boolean;
    ignoredTokens?: Set<string>;
    allowInitialism?: boolean;
    minimumSearchTokens?: number;
  } = {},
) {
  if (!candidate) {
    return false;
  }

  const candidateTokens = tokenizeSearchPhrase(candidate, {
    stripFillers,
    ignoredTokens,
  });
  if (!candidateTokens.length) {
    return false;
  }

  const candidateInitialism = allowInitialism ? buildInitialism(candidateTokens) : null;

  return searchValues.some((searchValue) => {
    const searchTokens = tokenizeSearchPhrase(searchValue, {
      stripFillers,
      ignoredTokens,
    });
    if (!searchTokens.length) {
      return false;
    }

    const normalizedSearch = searchTokens.join(" ");
    if (candidateInitialism && searchTokens.length === 1 && normalizedSearch === candidateInitialism) {
      return true;
    }

    if (searchTokens.length < minimumSearchTokens) {
      return false;
    }

    return hasTokenSequence(candidateTokens, searchTokens);
  });
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
export const formatLatency = (planStatus: SearchPlan["status"]) =>
  pipe(
    Match.value(planStatus),
    Match.when("deny", () => 96),
    Match.when("clarify", () => 118),
    Match.when("ready", () => 340),
    Match.exhaustive,
  );

function receiveStep(prompt: string, detail: string): TraceStep {
  return {
    id: "receive",
    title: "Receive natural language",
    agent: "Manager agent",
    agentTone: "purple",
    description: `User typed: "${prompt}"`,
    detail,
    timeLabel: "0 ms",
    state: "done",
  };
}

function parseStep(plan: SearchPlan, descriptionPrefix: string): TraceStep {
  return {
    id: "parse",
    title: "Parse intent into SearchRequest",
    agent: "Manager agent",
    agentTone: "purple",
    description: `${descriptionPrefix} ${plan.filters.length} ${plan.filters.length === 1 ? "filter" : "filters"}${plan.filters.length > 0 ? `: ${plan.filters.map((filter) => filter.type).join(", ")}` : ""}`,
    detail: JSON.stringify(
      { intent: plan.intent, filters: plan.filters, output_mode: plan.outputMode },
      null,
      2,
    ),
    timeLabel: "45 ms",
    state: "done",
  };
}

function buildSuccessTrace(prompt: string, plan: SearchPlan, totalResults: number): TraceStep[] {
  const encounterFilter = plan.filters.find((filter) => filter.type === "encounter");
  const locationFilter = plan.filters.find((filter) => filter.type === "location");
  const conditionFilter = plan.filters.find((filter) => filter.type === "condition");

  return [
    receiveStep(prompt, "Raw text passed to the manager agent. No preprocessing; the query remains intact."),
    parseStep(plan, "Extracted"),
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
      id: "decision",
      title: "Apply decision",
      agent: "Policy engine",
      agentTone: "purple",
      description: "Decision set to allow after scope, match, and visibility checks completed",
      detail: "The response is allowed only after the deterministic cohort, preset scope, and field-visibility rules agree on the final result set.",
      timeLabel: "268 ms",
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
 * Builds the trace artifact rendered in the client flow panel.
 */
export const buildTrace = (prompt: string, plan: SearchPlan, totalResults: number): TraceStep[] =>
  pipe(
    Match.value(plan.status),
    Match.when("deny", () => [
      receiveStep(prompt, "The request is evaluated before retrieval begins."),
      {
        id: "policy",
        title: "Apply safety gate",
        agent: "Manager agent",
        agentTone: "coral" as const,
        description: plan.denialReason ?? "Request refused by safety policy.",
        detail: "Unsupported medical-advice and instruction-override requests are blocked before any cohort search executes.",
        timeLabel: "96 ms",
        state: "active" as const,
      },
    ]),
    Match.when("clarify", () => [
      receiveStep(prompt, "The request is inspected as entered, without rewriting the prompt."),
      parseStep(plan, "Detected"),
      {
        id: "clarify",
        title: "Request clarification",
        agent: "Scope resolver",
        agentTone: "teal" as const,
        description: plan.clarificationQuestion ?? "The query needs one more detail before retrieval.",
        detail: `Missing fields: ${plan.missingFields.join(", ")}`,
        timeLabel: "118 ms",
        state: "active" as const,
      },
    ]),
    Match.when("ready", () => buildSuccessTrace(prompt, plan, totalResults)),
    Match.exhaustive,
  );

/**
 * Applies a single search filter to a normalized public encounter record.
 */
export function matchesFilter(record: PublicEncounterRecord, filter: SearchFilter) {
  const searchValues = [filter.canonicalValue, filter.value].filter(
    (value): value is string => Boolean(value?.trim()),
  );

  return pipe(
    Match.value(filter.type),
    Match.when("condition", () =>
      record.conditions.some(
        (condition) =>
          matchesCandidate(condition.label, searchValues) ||
          matchesCandidate(condition.code, searchValues) ||
          condition.aliases.some((alias) => matchesCandidate(alias, searchValues)),
      ),
    ),
    Match.when("location", () => {
      const normalizedSearchValues = new Set(
        searchValues
          .map((value) => normalizeSearchPhrase(value, true))
          .filter(Boolean),
      );
      const normalizedLocationId = normalizeSearchPhrase(record.locationId, true);

      return (
        matchesTokenSequence(record.locationName, searchValues, {
          stripFillers: true,
          allowInitialism: true,
        }) ||
        normalizedSearchValues.has(normalizedLocationId) ||
        matchesTokenSequence(record.organizationName, searchValues, {
          stripFillers: true,
          allowInitialism: true,
          minimumSearchTokens: 2,
        })
      );
    }),
    Match.when("encounter", () =>
      matchesTokenSequence(record.encounterClass, searchValues, {
        stripFillers: true,
        ignoredTokens: ENCOUNTER_NOISE_TOKENS,
      }) ||
      matchesTokenSequence(record.encounterService, searchValues, {
        stripFillers: true,
        ignoredTokens: ENCOUNTER_NOISE_TOKENS,
      }),
    ),
    Match.exhaustive,
  );
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
