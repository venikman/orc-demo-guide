import type {
  FieldVisibilityState,
  SearchMatch,
} from "../../../validation-schema";

type UserRole = "admin" | "nurse" | "provider";
type VisibleField =
  | "name"
  | "dob"
  | "mrn"
  | "conditions"
  | "payer"
  | "appointmentLabel"
  | "provider"
  | "explanations";

const FIELD_VISIBILITY_MATRIX: Record<UserRole, Record<VisibleField, FieldVisibilityState>> = {
  admin: {
    name: "visible",
    dob: "redacted",
    mrn: "visible",
    conditions: "hidden",
    payer: "visible",
    appointmentLabel: "visible",
    provider: "visible",
    explanations: "visible",
  },
  nurse: {
    name: "visible",
    dob: "visible",
    mrn: "visible",
    conditions: "visible",
    payer: "redacted",
    appointmentLabel: "visible",
    provider: "visible",
    explanations: "visible",
  },
  provider: {
    name: "visible",
    dob: "visible",
    mrn: "visible",
    conditions: "visible",
    payer: "visible",
    appointmentLabel: "visible",
    provider: "visible",
    explanations: "visible",
  },
};

const FIELD_ORDER: VisibleField[] = [
  "name",
  "dob",
  "mrn",
  "conditions",
  "payer",
  "appointmentLabel",
  "provider",
  "explanations",
];

/**
 * Returns the runtime visibility policy for a response field and role.
 */
export function getFieldVisibility(role: string, field: string): FieldVisibilityState {
  if (!(role in FIELD_VISIBILITY_MATRIX)) {
    return "hidden";
  }

  const roleMatrix = FIELD_VISIBILITY_MATRIX[role as UserRole];
  return roleMatrix[field as VisibleField] ?? "hidden";
}

/**
 * Applies redaction and hiding rules to search results before they are returned.
 */
export function applyFieldVisibility(results: SearchMatch[], role: string): SearchMatch[] {
  return results.map((result) => {
    const visibleResult: SearchMatch = {
      ...result,
    };

    for (const field of FIELD_ORDER) {
      const visibility = getFieldVisibility(role, field);
      if (visibility === "visible") {
        continue;
      }

      if (visibility === "redacted") {
        if (field === "dob" || field === "payer" || field === "name" || field === "mrn" || field === "appointmentLabel" || field === "provider") {
          visibleResult[field] = "***";
        }
        continue;
      }

      if (field === "conditions") {
        delete visibleResult.conditions;
      }
    }

    return visibleResult;
  });
}
