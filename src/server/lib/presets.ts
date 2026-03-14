import type { DemoSessionPreset, PresetId } from "../../../validation-schema";

const PRESETS: Record<PresetId, DemoSessionPreset> = {
  admin: {
    id: "admin",
    title: "Admin operations",
    description: "Broad clinic operations scope for routing and schedule coordination.",
    requester: {
      user_id: "user-admin-01",
      role: "admin",
      org_id: "org-springfield",
    },
    purpose_of_use: "operations",
    smart_scopes: ["site:springfield-family-medicine", "site:north-campus-primary-care"],
    field_visibility_profile_id: "profile-admin-minimum-necessary",
    allowedSiteIds: ["site-4021", "site-1108"],
    allowedProviders: ["Dr. Patel", "Dr. Chen", "Dr. Rao"],
  },
  nurse: {
    id: "nurse",
    title: "Nurse review",
    description: "Panel and clinic follow-up view for chronic disease workflows.",
    requester: {
      user_id: "user-nurse-01",
      role: "nurse",
      org_id: "org-springfield",
    },
    purpose_of_use: "treatment",
    smart_scopes: ["site:springfield-family-medicine"],
    field_visibility_profile_id: "profile-nurse-minimum-necessary",
    allowedSiteIds: ["site-4021"],
    allowedProviders: ["Dr. Patel", "Dr. Chen"],
  },
  provider: {
    id: "provider",
    title: "Provider panel",
    description: "Direct care scope with Springfield panel visibility.",
    requester: {
      user_id: "user-provider-01",
      role: "provider",
      org_id: "org-springfield",
    },
    purpose_of_use: "treatment",
    smart_scopes: ["site:springfield-family-medicine", "panel:patel", "panel:chen"],
    field_visibility_profile_id: "profile-provider-minimum-necessary",
    allowedSiteIds: ["site-4021"],
    allowedProviders: ["Dr. Patel", "Dr. Chen"],
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
