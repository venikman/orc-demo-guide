type SearchRequestEnvelope = {
  request_id: string; // UUID
  created_at: string; // ISO-8601 datetime
  raw_user_text: string;

  request: {
    capability:
      | "patient_lookup"
      | "cohort_search"
      | "record_explanation"
      | "coverage_check"
      | "payer_inquiry_draft";

    subject_scope: {
      kind: "single_person" | "cohort";
      in_context_patient_id?: string;
      person_refs?: Array<{
        system: "mrn" | "member_id" | "empi" | "fhir_patient_id";
        value: string;
      }>;
    };

    filters: {
      conditions?: Array<{
        query_text: string; // unresolved in step 1
        onset_from?: string; // ISO-8601 date
        onset_to?: string; // ISO-8601 date
      }>;

      appointments?: {
        start_from?: string; // ISO-8601 datetime
        start_to?: string; // ISO-8601 datetime
        specialty?: string[];
        location_ids?: string[];
      };

      payer?: {
        payer_ids?: string[];
        plan_ids?: string[];
      };

      service_query?: {
        text: string; // e.g. "MRI lumbar spine"
      };

      demographics?: {
        age_ge?: number;
        age_lt?: number;
        sex?: Array<"female" | "male" | "other" | "unknown">;
      };
    };

    output: {
      mode: "table" | "summary" | "explanation" | "draft";
      view_id: string; // approved output bundle
      max_results: number; // keep bounded, e.g. <= 100
    };

    clarification: {
      needed: boolean;
      missing_fields?: string[];
    };
  };

  trusted_context: {
    requester: {
      user_id: string;
      role: "admin" | "nurse" | "provider" | "auth_staff";
      org_id: string;
    };

    purpose_of_use:
      | "treatment"
      | "operations"
      | "prior_authorization"
      | "coverage_verification";

    smart_scopes: string[];
    field_visibility_profile_id: string;
    phase: "read_only_v1";
  };
};
