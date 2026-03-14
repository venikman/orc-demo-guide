import { Match, pipe } from "effect";

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
  "patientIdentifier",
  "conditions",
  "organizationName",
  "locationName",
  "encounterLabel",
  "explanations",
] as const;

const getAction = (status: SearchResponseEnvelope["status"]) =>
  pipe(
    Match.value(status),
    Match.when("success", () => "allow" as const),
    Match.when("clarify", () => "escalate" as const),
    Match.when("deny", () => "deny" as const),
    Match.exhaustive,
  );

const getReason = (response: SearchResponseEnvelope) =>
  pipe(
    Match.value(response.status),
    Match.when("success", () => response.interpretedSummary),
    Match.when("clarify", () => response.clarificationQuestion ?? response.interpretedSummary),
    Match.when("deny", () => response.denialReason ?? response.interpretedSummary),
    Match.exhaustive,
  );

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
