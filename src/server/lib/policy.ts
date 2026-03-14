import type {
  DemoSessionPreset,
  PolicyDecision,
  SearchResponseEnvelope,
} from "../../../validation-schema";
import { policyDecisionSchema } from "../../../validation-schema";
import { getFieldVisibility } from "./field-visibility";

const POLICY_VERSION = "2026-03-14.wave-1";
const POLICY_FIELDS = [
  "name",
  "dob",
  "mrn",
  "conditions",
  "payer",
  "appointmentLabel",
  "provider",
  "explanations",
] as const;

function getAction(status: SearchResponseEnvelope["status"]) {
  if (status === "success") {
    return "allow";
  }

  if (status === "clarify") {
    return "escalate";
  }

  return "deny";
}

function getReason(response: SearchResponseEnvelope) {
  if (response.status === "success") {
    return response.interpretedSummary;
  }

  if (response.status === "clarify") {
    return response.clarificationQuestion ?? response.interpretedSummary;
  }

  return response.denialReason ?? response.interpretedSummary;
}

/**
 * Builds the policy artifact returned with each search response.
 */
export function buildPolicyDecision(
  requestId: string,
  preset: DemoSessionPreset,
  response: SearchResponseEnvelope,
): PolicyDecision {
  return policyDecisionSchema.parse({
    decision_id: crypto.randomUUID(),
    request_id: requestId,
    timestamp: new Date().toISOString(),
    action: getAction(response.status),
    reason: getReason(response),
    policy_version: POLICY_VERSION,
    role: preset.requester.role,
    purpose_of_use: preset.purpose_of_use,
    effective_scopes: preset.smart_scopes,
    field_visibility: Object.fromEntries(
      POLICY_FIELDS.map((field) => [field, getFieldVisibility(preset.requester.role, field)]),
    ),
  });
}
