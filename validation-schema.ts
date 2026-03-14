import { z } from "zod";

export const presetIdSchema = z.enum(["admin", "nurse", "provider"]);
export type PresetId = z.infer<typeof presetIdSchema>;

export const filterTypeSchema = z.enum([
  "condition",
  "location",
  "appointment",
  "payer",
  "coverage",
  "pa_status",
  "panel",
]);
export type FilterType = z.infer<typeof filterTypeSchema>;

export const searchFilterSchema = z.object({
  type: filterTypeSchema,
  value: z.string().min(1),
  canonicalValue: z.string().optional(),
});
export type SearchFilter = z.infer<typeof searchFilterSchema>;

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
  allowedSiteIds: string[];
  allowedProviders: string[];
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

export type SearchMatch = {
  id: string;
  initials: string;
  name: string;
  dob: string;
  mrn: string;
  siteId: string;
  siteName: string;
  provider: string;
  payer: string;
  conditions: Array<{
    label: string;
    code: string;
    aliases: string[];
  }>;
  appointmentLabel: string;
  appointmentIso: string;
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
  sourceMode: "gemini_api";
  modelUsed?: string;
  prompt: string;
  presetId: PresetId;
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
};

export const searchRequestInputSchema = z.object({
  prompt: z.string().min(4).max(240),
  presetId: presetIdSchema,
});

export type SearchRequestInput = z.infer<typeof searchRequestInputSchema>;
