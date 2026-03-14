import type {
  PresetId,
  SearchResponseEnvelope,
  SearchTransportMode,
} from "../../../validation-schema";
import { compileSearchPlan } from "./compile";
import { logEvent } from "./logging";
import { getPreset } from "./presets";
import { executeSearch } from "./retrieve";

type SearchWorkflowInput = {
  requestId: string;
  prompt: string;
  presetId: PresetId;
  transport: SearchTransportMode;
  threadId?: string;
  signal?: AbortSignal;
};

function throwIfAborted(signal?: AbortSignal) {
  signal?.throwIfAborted?.();

  if (signal?.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : new DOMException("The operation was aborted.", "AbortError");
  }
}

export async function runSearchWorkflow(input: SearchWorkflowInput): Promise<SearchResponseEnvelope> {
  throwIfAborted(input.signal);
  const preset = getPreset(input.presetId);

  logEvent("api.search.request", {
    request_id: input.requestId,
    preset_id: input.presetId,
    prompt_length: input.prompt.length,
    transport: input.transport,
    thread_id: input.threadId ?? null,
  });

  const { plan, sourceMode, modelUsed, aiUsage } = await compileSearchPlan(input.prompt, {
    requestId: input.requestId,
    presetId: input.presetId,
    transport: input.transport,
    threadId: input.threadId,
    signal: input.signal,
  });

  throwIfAborted(input.signal);
  const response = executeSearch(input.prompt, preset, plan, {
    requestId: input.requestId,
    sourceMode,
    modelUsed,
    aiUsage,
    transport: input.transport,
    threadId: input.threadId,
  });

  logEvent("api.search.response", {
    request_id: input.requestId,
    status: response.status,
    source_mode: response.sourceMode,
    model_used: response.modelUsed,
    matched: response.totalResults,
    latency_ms: response.stats.latencyMs,
    filters: plan.filters,
    clarification_question: response.clarificationQuestion,
    denial_reason: response.denialReason,
    preview_count: Math.min(response.previewCount, response.totalResults),
  });

  logEvent("monitor.ai_usage", {
    request_id: input.requestId,
    ...response.monitoring.aiUsage,
  });
  logEvent("monitor.data_flow", {
    request_id: input.requestId,
    stages: response.monitoring.dataFlow,
  });

  return response;
}
