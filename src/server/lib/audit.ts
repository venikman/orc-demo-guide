import type {
  AuditEvent,
  DemoSessionPreset,
  SearchResponseEnvelope,
} from "../../../validation-schema";
import { auditEventSchema } from "../../../validation-schema";

type BuildAuditEventInput = {
  requestId: string;
  preset: DemoSessionPreset;
  outcome: SearchResponseEnvelope["status"];
  sourceMode: SearchResponseEnvelope["sourceMode"];
  modelUsed?: string;
  detail?: Record<string, unknown>;
};

/**
 * Builds and validates the typed audit event emitted for search responses.
 */
export function buildAuditEvent(input: BuildAuditEventInput): AuditEvent {
  return auditEventSchema.parse({
    event_id: crypto.randomUUID(),
    request_id: input.requestId,
    timestamp: new Date().toISOString(),
    actor: input.preset.requester,
    action: "search",
    resource_type: "cohort",
    outcome: input.outcome,
    detail: input.detail,
    purpose_of_use: input.preset.purpose_of_use,
    source_mode: input.sourceMode,
    model_used: input.modelUsed,
  });
}

/**
 * Writes the typed audit event using the existing `[audit]` log format.
 */
export function writeAuditEvent(input: BuildAuditEventInput): AuditEvent {
  const event = buildAuditEvent(input);
  console.log("[audit]", JSON.stringify(event));
  return event;
}
