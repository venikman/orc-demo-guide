import type {
  DemoSessionPreset,
  SearchMatch,
  SearchPlan,
  SearchResponseEnvelope,
} from "../../../validation-schema";
import { getSyntheticMatches } from "../data/fixtures";
import { writeAuditEvent } from "./audit";
import { applyFieldVisibility } from "./field-visibility";
import { logEvent } from "./logging";
import { buildPolicyDecision } from "./policy";
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
  sourceMode: "gemini_api",
  requestId: string,
  modelUsed?: string,
): SearchResponseEnvelope {
  const request = buildRequestEnvelope(requestId, prompt, preset, plan);
  const latencyMs = formatLatency(plan.status);

  if (plan.status === "deny") {
    return finalizeResponse(request.request_id, preset, {
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
    });
  }

  if (plan.status === "clarify") {
    return finalizeResponse(request.request_id, preset, {
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
    });
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
  const visibleMatches = applyFieldVisibility(filteredMatches, preset.requester.role);

  logEvent("retrieval.response", {
    request_id: request.request_id,
    matched: visibleMatches.length,
    preview_names: visibleMatches.slice(0, PREVIEW_COUNT).map((result) => result.name),
  });

  return finalizeResponse(request.request_id, preset, {
    requestId: request.request_id,
    status: "success",
    sourceMode,
    modelUsed,
    prompt,
    presetId: preset.id,
    interpretedSummary: plan.summary ?? "Natural-language query compiled into deterministic cohort filters.",
    stats: {
      matched: visibleMatches.length,
      sources: SOURCE_COUNT,
      latencyMs,
    },
    chips: plan.filters.map((filter) => filter.type),
    trace: buildTrace(prompt, plan, visibleMatches.length),
    results: visibleMatches,
    totalResults: visibleMatches.length,
    previewCount: PREVIEW_COUNT,
  });
}
