import type { DemoSessionPreset, PresetId } from "../../../validation-schema";
import {
  PUBLIC_DATASET_LOCATIONS,
  PUBLIC_DATASET_ORGANIZATIONS,
  type PublicDatasetLocation,
} from "../../shared/public-dataset-meta";

const PROVIDER_LOCATIONS = [
  "Emergency Department",
  "Observation",
  "Medicine",
  "Medicine/Cardiology",
  "Trauma SICU (TSICU)",
] satisfies PublicDatasetLocation[];

const NURSE_LOCATIONS = [
  "Emergency Department",
  "Observation",
  "Med/Surg",
  "Medicine",
  "Medicine/Cardiology",
  "Neurology",
  "Hematology/Oncology",
] satisfies PublicDatasetLocation[];

const PRESETS: Record<PresetId, DemoSessionPreset> = {
  admin: {
    id: "admin",
    title: "Operations review",
    description: "Broad encounter operations scope across the public FHIR demo dataset.",
    requester: {
      user_id: "user-admin-01",
      role: "admin",
      org_id: "org-bidmc",
    },
    purpose_of_use: "operations",
    smart_scopes: [
      "org:beth-israel-deaconess-medical-center",
      "dataset:mimic-iv-fhir-demo",
      "locations:all",
    ],
    field_visibility_profile_id: "profile-admin-minimum-necessary",
    allowedOrganizationNames: [...PUBLIC_DATASET_ORGANIZATIONS],
    allowedLocationNames: [...PUBLIC_DATASET_LOCATIONS],
  },
  nurse: {
    id: "nurse",
    title: "Nurse review",
    description: "Focused encounter review for high-throughput acute-care locations.",
    requester: {
      user_id: "user-nurse-01",
      role: "nurse",
      org_id: "org-bidmc",
    },
    purpose_of_use: "treatment",
    smart_scopes: [
      "org:beth-israel-deaconess-medical-center",
      "locations:acute-care",
    ],
    field_visibility_profile_id: "profile-nurse-minimum-necessary",
    allowedOrganizationNames: [...PUBLIC_DATASET_ORGANIZATIONS],
    allowedLocationNames: NURSE_LOCATIONS,
  },
  provider: {
    id: "provider",
    title: "Encounter cohort",
    description: "Direct-care scope across selected public FHIR encounter locations.",
    requester: {
      user_id: "user-provider-01",
      role: "provider",
      org_id: "org-bidmc",
    },
    purpose_of_use: "treatment",
    smart_scopes: [
      "org:beth-israel-deaconess-medical-center",
      "locations:provider-scope",
    ],
    field_visibility_profile_id: "profile-provider-minimum-necessary",
    allowedOrganizationNames: [...PUBLIC_DATASET_ORGANIZATIONS],
    allowedLocationNames: PROVIDER_LOCATIONS,
  },
};

export function getPreset(presetId: PresetId): DemoSessionPreset {
  return PRESETS[presetId];
}

export function getPresetSummaries() {
  return Object.values(PRESETS).map(({ id, title, description }) => ({
    id,
    title,
    description,
  }));
}
