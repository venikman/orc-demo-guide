import type { SearchFilter, SearchMatch, SearchPlan } from "../../../validation-schema";
import { MIMIC_DEMO_INDEX } from "../data/public/mimic-demo-index";

export type PublicEncounterRecord = (typeof MIMIC_DEMO_INDEX.records)[number];

function truncateLabel(value: string, max = 20) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getMatchedConditions(record: PublicEncounterRecord, filters: SearchFilter[]) {
  const conditionFilters = filters.filter((filter) => filter.type === "condition");
  if (!conditionFilters.length) {
    return record.conditions.slice(0, 2);
  }

  const matched = record.conditions.filter((condition) =>
    conditionFilters.some((filter) => {
      const lowerValue = normalizeText(filter.value);
      return condition.aliases.some(
        (alias) => alias.includes(lowerValue) || lowerValue.includes(alias),
      );
    }),
  );

  return matched.length > 0 ? matched.slice(0, 2) : record.conditions.slice(0, 2);
}

function buildExplanations(record: PublicEncounterRecord, plan: SearchPlan): SearchMatch["explanations"] {
  const explanations: SearchMatch["explanations"] = [];
  const matchedConditions = getMatchedConditions(record, plan.filters);

  if (matchedConditions.length > 0) {
    explanations.push({
      tone: "teal",
      text: `Condition match: ${matchedConditions.map((condition) => `${condition.code} ${condition.label}`.trim()).join(" • ")}`,
      source: "Condition",
    });
  }

  explanations.push({
    tone: "purple",
    text: `Location match: ${record.locationName}`,
    source: "Location",
  });

  explanations.push({
    tone: "amber",
    text: `Encounter: ${record.encounterLabel}`,
    source: "Encounter",
  });

  explanations.push({
    tone: "purple",
    text: `Organization: ${record.organizationName}`,
    source: "Organization",
  });

  return explanations;
}

function buildBadges(record: PublicEncounterRecord): SearchMatch["badges"] {
  return record.badges.map((badge, index) => ({
    label: truncateLabel(badge.label),
    tone: index === 2 && badge.tone === "green" ? "amber" : badge.tone,
  }));
}

export function getPublicDatasetRecords(): PublicEncounterRecord[] {
  return [...MIMIC_DEMO_INDEX.records];
}

export function getPublicDatasetSourceCount() {
  return 5;
}

export function buildSearchMatch(
  record: PublicEncounterRecord,
  plan: SearchPlan,
): SearchMatch {
  return {
    id: record.id,
    initials: record.initials,
    name: record.name,
    dob: record.dob ?? "Unknown",
    patientIdentifier: record.patientIdentifier,
    organizationName: record.organizationName,
    locationId: record.locationId ?? "unknown",
    locationName: record.locationName,
    encounterLabel: record.encounterLabel,
    conditions: record.conditions.map((condition) => ({
      label: condition.label,
      code: condition.code ?? "unknown",
      aliases: [...condition.aliases],
    })),
    badges: buildBadges(record),
    explanations: buildExplanations(record, plan),
  };
}
