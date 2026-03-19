import type { AgentType } from "./types.ts";

export interface Scenario {
  id: string;
  agent: AgentType;
  query: string;
}

export interface Workflow {
  id: string;
  label: string;
  description: string;
  scenarios: Scenario[];
  examples: string[];
  gaps: string[];
}

export const workflows: Workflow[] = [
  {
    id: "care-gaps",
    label: "Care Gaps",
    description:
      "Close care gaps for attributed members — find patients missing screenings, treatments, or follow-ups that count toward quality and reconciliation.",
    scenarios: [
      {
        id: "gaps-metformin",
        agent: "cohort",
        query: "Patients on metformin without a diabetes diagnosis",
      },
      {
        id: "gaps-preventive",
        agent: "cohort",
        query: "Which patients haven't had a preventive care visit?",
      },
      {
        id: "gaps-hba1c",
        agent: "cohort",
        query: "Patients with diabetes but no recent HbA1c observation",
      },
      {
        id: "gaps-hypertension",
        agent: "cohort",
        query: "Active hypertension without treatment — who's at risk?",
      },
    ],
    examples: ["Patients with diabetes AND HbA1c > 9", "Find all patients with type 2 diabetes"],
    gaps: [],
  },
  {
    id: "quality",
    label: "Quality & Performance",
    description:
      "Meet quality metrics and track performance against targets — aggregate clinical data to measure compliance and identify outliers.",
    scenarios: [
      {
        id: "quality-diabetes-encounters",
        agent: "analytics",
        query: "Diabetes-related encounters — top 3 providers?",
      },
      {
        id: "quality-network",
        agent: "analytics",
        query: "Compare the provider network",
      },
      {
        id: "quality-practitioners",
        agent: "analytics",
        query: "How many practitioners per organization?",
      },
    ],
    examples: [
      "How many patients have a diabetes diagnosis?",
      "Which providers have the most encounters?",
    ],
    gaps: [
      "No HEDIS/CMS Stars measure engine — uses ad-hoc queries, not formal MeasureReport resources",
    ],
  },
  {
    id: "utilization",
    label: "Utilization & Costs",
    description:
      "Track care costs and utilization for attributed patients — monitor encounter volumes and specialist activity as a proxy for spend.",
    scenarios: [
      {
        id: "util-encounters",
        agent: "search",
        query: "All encounters for James Smith",
      },
      {
        id: "util-patient-search",
        agent: "search",
        query: "Find female patients over 60",
      },
    ],
    examples: ["Tell me about patient James Smith", "What procedures has patient-0001 had?"],
    gaps: [
      "No Claim/ExplanationOfBenefit resources — cannot compute actual costs or PMPM",
      "No ServiceRequest resources — cannot track referrals to specialists",
    ],
  },
  {
    id: "membership",
    label: "Membership & Attribution",
    description:
      "Track monthly membership, confirm attribution, and review panel composition — verify who is on the list and their coverage status.",
    scenarios: [
      {
        id: "member-lists",
        agent: "lookup",
        query: "Which attribution lists exist in the system?",
      },
      {
        id: "member-insurance",
        agent: "lookup",
        query: "What insurance does patient-0001 have?",
      },
    ],
    examples: [
      "Is patient-0003 covered by Northwind Health Plan?",
      "How many patients per attribution group?",
    ],
    gaps: [
      "No historical membership snapshots — shows current state, not monthly trends",
      "No prospective list ingestion — cannot compare year-over-year attribution",
      "No Contract resources — cannot map members to specific plan/PMPM terms",
    ],
  },
  {
    id: "clinical",
    label: "Patient History & Continuity",
    description:
      "Maintain clinical context as members transition — pull conditions, meds, labs, and encounters into narrative summaries for care continuity.",
    scenarios: [
      {
        id: "clinical-summary",
        agent: "clinical",
        query: "Full clinical summary for patient-0001",
      },
      {
        id: "clinical-encounter",
        agent: "clinical",
        query: "Tell me about encounter-0001 in plain English",
      },
    ],
    examples: ["What conditions does patient-0001 have?", "What medications is patient-0001 on?"],
    gaps: [],
  },
  {
    id: "reconciliation",
    label: "Reconciliation & Export",
    description:
      "Export data for end-of-year reconciliation — bulk export FHIR resources to verify attribution and document care delivered.",
    scenarios: [
      {
        id: "recon-export",
        agent: "export",
        query: "Export all data for the ACO and tell me what we have",
      },
    ],
    examples: ["Export all data for the ACO"],
    gaps: [
      "No financial reconciliation engine — exports raw FHIR data, not credit/debit calculations",
      "No Contract resources — cannot determine which patients qualify for credit by plan",
    ],
  },
];

export function findWorkflowByQuery(query: string): Workflow | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  return (
    workflows.find(
      (workflow) =>
        workflow.scenarios.some((scenario) => scenario.query === trimmed) ||
        workflow.examples.some((example) => example === trimmed),
    ) ?? null
  );
}
