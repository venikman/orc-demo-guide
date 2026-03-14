import { Match, pipe } from "effect";

import type {
  FieldVisibilityState,
  SearchMatch,
} from "../../../validation-schema";

type UserRole = "admin" | "nurse" | "provider";
type VisibleField =
  | "name"
  | "dob"
  | "patientIdentifier"
  | "conditions"
  | "organizationName"
  | "locationName"
  | "encounterLabel"
  | "explanations";

const FIELD_VISIBILITY_MATRIX: Record<UserRole, Record<VisibleField, FieldVisibilityState>> = {
  admin: {
    name: "visible",
    dob: "redacted",
    patientIdentifier: "visible",
    conditions: "hidden",
    organizationName: "visible",
    locationName: "visible",
    encounterLabel: "visible",
    explanations: "visible",
  },
  nurse: {
    name: "visible",
    dob: "visible",
    patientIdentifier: "visible",
    conditions: "visible",
    organizationName: "visible",
    locationName: "visible",
    encounterLabel: "visible",
    explanations: "visible",
  },
  provider: {
    name: "visible",
    dob: "visible",
    patientIdentifier: "visible",
    conditions: "visible",
    organizationName: "visible",
    locationName: "visible",
    encounterLabel: "visible",
    explanations: "visible",
  },
};

const FIELD_ORDER: VisibleField[] = [
  "name",
  "dob",
  "patientIdentifier",
  "conditions",
  "organizationName",
  "locationName",
  "encounterLabel",
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

const REDACTABLE_FIELDS = new Set<VisibleField>([
  "dob",
  "name",
  "patientIdentifier",
  "organizationName",
  "locationName",
  "encounterLabel",
]);

function applyFieldToResult(result: SearchMatch, field: VisibleField, role: string): SearchMatch {
  return pipe(
    Match.value(getFieldVisibility(role, field)),
    Match.when("visible", () => result),
    Match.when("redacted", () =>
      REDACTABLE_FIELDS.has(field)
        ? { ...result, [field]: "***" }
        : result,
    ),
    Match.when("hidden", () => {
      if (field === "conditions") {
        const { conditions: _, ...rest } = result;
        return rest as SearchMatch;
      }
      return result;
    }),
    Match.exhaustive,
  );
}

/**
 * Applies redaction and hiding rules to search results before they are returned.
 */
export function applyFieldVisibility(results: SearchMatch[], role: string): SearchMatch[] {
  return results.map((result) =>
    FIELD_ORDER.reduce<SearchMatch>(
      (acc, field) => applyFieldToResult(acc, field, role),
      { ...result },
    ),
  );
}
