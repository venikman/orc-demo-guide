export type ProviderRecord = {
  providerId: string;
  name: string;
  npi: string;
  specialty: string;
  siteIds: string[];
  panelSize: number;
};

export type PanelInfo = {
  providerId: string;
  providerName: string;
  siteIds: string[];
  memberCount: number;
};

const PROVIDERS: ProviderRecord[] = [
  {
    providerId: "provider-patel",
    name: "Dr. Patel",
    npi: "1912345678",
    specialty: "Family Medicine",
    siteIds: ["site-4021"],
    panelSize: 184,
  },
  {
    providerId: "provider-chen",
    name: "Dr. Chen",
    npi: "1823456789",
    specialty: "Internal Medicine",
    siteIds: ["site-4021"],
    panelSize: 167,
  },
  {
    providerId: "provider-rao",
    name: "Dr. Rao",
    npi: "1734567890",
    specialty: "Primary Care",
    siteIds: ["site-1108"],
    panelSize: 143,
  },
];

/**
 * Synthetic provider directory adapter aligned with the demo presets.
 */
export const directoryAdapter = {
  getProviderByName(name: string): ProviderRecord | undefined {
    const lowerName = name.toLowerCase();
    return PROVIDERS.find((provider) => provider.name.toLowerCase() === lowerName);
  },

  getProvidersBySite(siteId: string): ProviderRecord[] {
    return PROVIDERS.filter((provider) => provider.siteIds.includes(siteId));
  },

  getProviderPanel(providerId: string): PanelInfo {
    const provider = PROVIDERS.find((entry) => entry.providerId === providerId);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    return {
      providerId: provider.providerId,
      providerName: provider.name,
      siteIds: provider.siteIds,
      memberCount: provider.panelSize,
    };
  },
};
