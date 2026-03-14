import type { FilterType, SearchPlan } from "../../../validation-schema";

type UserRole = "admin" | "nurse" | "provider";

export type ToolRiskLevel = "low" | "medium" | "high";

export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  risk: ToolRiskLevel;
  requiresPolicy: boolean;
  allowedRoles: UserRole[];
  filterTypes: FilterType[];
};

const TOOL_REGISTRY: ToolDefinition[] = [
  {
    id: "condition_lookup",
    name: "Condition Concept Lookup",
    description: "Look up conditions by label, code, or alias",
    risk: "low",
    requiresPolicy: false,
    allowedRoles: ["admin", "nurse", "provider"],
    filterTypes: ["condition"],
  },
  {
    id: "encounter_search",
    name: "Encounter Search",
    description: "Search encounters by timing, class, or service context",
    risk: "low",
    requiresPolicy: false,
    allowedRoles: ["admin", "nurse", "provider"],
    filterTypes: ["encounter"],
  },
  {
    id: "location_filter",
    name: "Location Filtering",
    description: "Filter by department, ward, or organization location",
    risk: "low",
    requiresPolicy: false,
    allowedRoles: ["admin", "nurse", "provider"],
    filterTypes: ["location"],
  },
  {
    id: "cohort_count",
    name: "Cohort Count",
    description: "Count members matching all active filters",
    risk: "medium",
    requiresPolicy: true,
    allowedRoles: ["admin", "nurse", "provider"],
    filterTypes: [],
  },
  {
    id: "encounter_cards",
    name: "Encounter Cards",
    description: "Return de-identified encounter detail cards with explanations",
    risk: "medium",
    requiresPolicy: true,
    allowedRoles: ["nurse", "provider"],
    filterTypes: [],
  },
];

function isRelevantTool(tool: ToolDefinition, plan: SearchPlan) {
  if (tool.filterTypes.length === 0) {
    return true;
  }

  return plan.filters.some((filter) => tool.filterTypes.includes(filter.type));
}

/**
 * Returns a tool definition by its registry identifier.
 */
export function getToolById(toolId: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((tool) => tool.id === toolId);
}

/**
 * Returns whether a role is allowed to use the tool.
 */
export function isToolAllowed(toolId: string, role: UserRole): boolean {
  return getToolById(toolId)?.allowedRoles.includes(role) ?? false;
}

/**
 * Selects the tools relevant to a plan after role-based filtering.
 */
export function getToolsForPlan(plan: SearchPlan, role: UserRole): ToolDefinition[] {
  return TOOL_REGISTRY.filter(
    (tool) => tool.allowedRoles.includes(role) && isRelevantTool(tool, plan),
  );
}
