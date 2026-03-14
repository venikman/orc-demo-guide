import { z } from "zod";

export const presetIdSchema = z.enum(["admin", "nurse", "provider"]);
export type PresetId = z.infer<typeof presetIdSchema>;

export const searchSourceModeSchema = z.enum(["langchain_google_agent"]);
export type SearchSourceMode = z.infer<typeof searchSourceModeSchema>;

export const searchTransportModeSchema = z.enum(["request_reply", "use_stream"]);
export type SearchTransportMode = z.infer<typeof searchTransportModeSchema>;

export const filterTypeSchema = z.enum([
  "condition",
  "location",
  "encounter",
]);
export type FilterType = z.infer<typeof filterTypeSchema>;

export const searchFilterSchema = z.object({
  type: filterTypeSchema,
  value: z.string().min(1),
  canonicalValue: z.string().optional(),
});
export type SearchFilter = z.infer<typeof searchFilterSchema>;

/**
 * Runtime visibility states applied to response fields.
 */
export const fieldVisibilityStateSchema = z.enum(["visible", "redacted", "hidden"]);
export type FieldVisibilityState = z.infer<typeof fieldVisibilityStateSchema>;

export const llmSearchPlanSchema = z.object({
  intent: z.literal("find_members"),
  status: z.enum(["ready", "clarify", "deny"]),
  filters: z.array(searchFilterSchema).max(6).default([]),
  summary: z.string().max(240).optional(),
  clarificationQuestion: z.string().max(240).optional(),
  missingFields: z.array(z.string()).max(4).default([]),
  denialReason: z.string().max(240).optional(),
});

export type SearchPlan = z.infer<typeof llmSearchPlanSchema> & {
  capability: "cohort_search";
  outputMode: "cards";
};

export type DemoSessionPreset = {
  id: PresetId;
  title: string;
  description: string;
  requester: {
    user_id: string;
    role: "admin" | "nurse" | "provider";
    org_id: string;
  };
  purpose_of_use: "treatment" | "operations";
  smart_scopes: string[];
  field_visibility_profile_id: string;
  allowedOrganizationNames: string[];
  allowedLocationNames: string[];
};

export type SearchRequestEnvelope = {
  request_id: string;
  created_at: string;
  raw_user_text: string;
  request: {
    capability: "cohort_search";
    filters: SearchFilter[];
    output: {
      mode: "cards";
      max_results: number;
    };
    clarification: {
      needed: boolean;
      missing_fields?: string[];
    };
  };
  trusted_context: {
    requester: DemoSessionPreset["requester"];
    purpose_of_use: DemoSessionPreset["purpose_of_use"];
    smart_scopes: string[];
    field_visibility_profile_id: string;
    phase: "read_only_v1";
  };
};

export type TraceStep = {
  id: string;
  title: string;
  agent: string;
  agentTone: "purple" | "teal" | "blue" | "coral";
  description: string;
  detail: string;
  timeLabel: string;
  state: "done" | "active";
};

export const aiUsageSchema = z.object({
  framework: z.literal("langchain"),
  runtime: z.literal("createAgent"),
  provider: z.literal("google_genai"),
  sourceMode: searchSourceModeSchema,
  transport: searchTransportModeSchema,
  threadId: z.string().optional(),
  model: z.string().nullable(),
  inputTokens: z.number().nullable(),
  outputTokens: z.number().nullable(),
  totalTokens: z.number().nullable(),
});
export type AiUsage = z.infer<typeof aiUsageSchema>;

export const dataFlowStageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  countLabel: z.string().min(1).optional(),
});
export type DataFlowStage = z.infer<typeof dataFlowStageSchema>;

export const searchMonitoringSchema = z.object({
  aiUsage: aiUsageSchema,
  dataFlow: z.array(dataFlowStageSchema).max(8),
});
export type SearchMonitoring = z.infer<typeof searchMonitoringSchema>;

export type SearchMatch = {
  id: string;
  initials: string;
  name: string;
  dob: string;
  patientIdentifier: string;
  organizationName: string;
  locationId: string;
  locationName: string;
  conditions?: Array<{
    label: string;
    code: string;
    aliases: string[];
  }>;
  encounterLabel: string;
  badges: Array<{
    label: string;
    tone: "green" | "amber" | "blue";
  }>;
  explanations: Array<{
    tone: "teal" | "purple" | "amber";
    text: string;
    source: string;
  }>;
};

export type SearchResponseEnvelope = {
  requestId: string;
  status: "success" | "clarify" | "deny";
  sourceMode: SearchSourceMode;
  modelUsed?: string;
  prompt: string;
  presetId: PresetId;
  plan: SearchPlan;
  interpretedSummary: string;
  stats: {
    matched: number;
    sources: number;
    latencyMs: number;
  };
  chips: FilterType[];
  trace: TraceStep[];
  results: SearchMatch[];
  totalResults: number;
  previewCount: number;
  clarificationQuestion?: string;
  denialReason?: string;
  policyDecision: PolicyDecision;
  monitoring: SearchMonitoring;
};

export type SearchStreamState = {
  prompt: string;
  presetId: PresetId;
  response: SearchResponseEnvelope | null;
};

export const searchRequestInputSchema = z.object({
  prompt: z.string().min(4).max(240),
  presetId: presetIdSchema,
});

export type SearchRequestInput = z.infer<typeof searchRequestInputSchema>;

/**
 * Policy artifact returned alongside each search response.
 */
export const policyDecisionSchema = z.object({
  decision_id: z.string().uuid(),
  request_id: z.string().uuid(),
  timestamp: z.string().datetime(),
  action: z.enum(["allow", "deny", "escalate"]),
  reason: z.string().max(500),
  policy_version: z.string(),
  role: z.enum(["admin", "nurse", "provider"]),
  purpose_of_use: z.enum(["treatment", "operations"]),
  effective_scopes: z.array(z.string()),
  field_visibility: z.record(fieldVisibilityStateSchema),
});
export type PolicyDecision = z.infer<typeof policyDecisionSchema>;

/**
 * Typed audit event logged for provider-side search actions.
 */
export const auditEventSchema = z.object({
  event_id: z.string().uuid(),
  request_id: z.string().uuid(),
  timestamp: z.string().datetime(),
  actor: z.object({
    user_id: z.string(),
    role: z.enum(["admin", "nurse", "provider"]),
    org_id: z.string(),
  }),
  action: z.enum(["search", "view_result", "export", "escalate"]),
  resource_type: z.enum(["cohort", "member", "policy"]),
  outcome: z.enum(["success", "deny", "clarify", "error"]),
  detail: z.record(z.unknown()).optional(),
  purpose_of_use: z.enum(["treatment", "operations"]),
  source_mode: searchSourceModeSchema,
  model_used: z.string().optional(),
});
export type AuditEvent = z.infer<typeof auditEventSchema>;
