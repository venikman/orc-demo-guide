import { getSyntheticMatches } from "../../data/fixtures";

export type FHIRBundle<TResource> = {
  resourceType: "Bundle";
  type: "searchset";
  total: number;
  entry: Array<{
    resource: TResource;
  }>;
};

export type FHIRPatient = {
  resourceType: "Patient";
  id: string;
  birthDate: string;
  identifier: Array<{
    system: string;
    value: string;
  }>;
  name: Array<{
    text: string;
    family: string;
    given: string[];
  }>;
};

export type FHIRCondition = {
  resourceType: "Condition";
  id: string;
  subject: {
    reference: string;
  };
  clinicalStatus: {
    text: "active";
  };
  code: {
    text: string;
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
};

export type FHIRAppointment = {
  resourceType: "Appointment";
  id: string;
  status: "booked";
  description: string;
  start: string;
  participant: Array<{
    actor: {
      display: string;
    };
  }>;
};

export type FHIRPatientBundle = FHIRBundle<FHIRPatient>;
export type FHIRConditionBundle = FHIRBundle<FHIRCondition>;
export type FHIRAppointmentBundle = FHIRBundle<FHIRAppointment>;

export interface FHIRAdapter {
  searchPatient(params: { name?: string; mrn?: string }): FHIRPatientBundle;
  getConditions(patientId: string): FHIRConditionBundle;
  getAppointments(patientId: string): FHIRAppointmentBundle;
}

function ensureStubAllowed() {
  if (process.env.NODE_ENV === "production" && !process.env.FHIR_BASE_URL) {
    throw new Error("FHIR stub adapter is disabled in production without FHIR_BASE_URL.");
  }
}

function mapPatientName(name: string) {
  const parts = name.split(" ");
  return {
    text: name,
    family: parts.at(-1) ?? name,
    given: parts.slice(0, -1),
  };
}

function getMatches(patientId?: string) {
  return getSyntheticMatches().filter((match) => !patientId || match.id === patientId);
}

/**
 * Synthetic FHIR R4 adapter backed by the demo fixture set.
 */
export const fhirAdapter: FHIRAdapter = {
  searchPatient(params) {
    ensureStubAllowed();
    const lowerName = params.name?.toLowerCase();
    const lowerMrn = params.mrn?.toLowerCase();
    const matches = getSyntheticMatches().filter((match) => {
      const matchesName = lowerName ? match.name.toLowerCase().includes(lowerName) : true;
      const matchesMrn = lowerMrn ? match.mrn.toLowerCase() === lowerMrn : true;
      return matchesName && matchesMrn;
    });

    return {
      resourceType: "Bundle",
      type: "searchset",
      total: matches.length,
      entry: matches.map((match) => ({
        resource: {
          resourceType: "Patient",
          id: match.id,
          birthDate: match.dob,
          identifier: [
            {
              system: "urn:mrn",
              value: match.mrn,
            },
          ],
          name: [mapPatientName(match.name)],
        },
      })),
    };
  },

  getConditions(patientId) {
    ensureStubAllowed();
    const entries = getMatches(patientId).flatMap((match) =>
      (match.conditions ?? []).map((condition) => ({
        resource: {
          resourceType: "Condition" as const,
          id: `${match.id}-${condition.code.toLowerCase()}`,
          subject: {
            reference: `Patient/${match.id}`,
          },
          clinicalStatus: {
            text: "active" as const,
          },
          code: {
            text: condition.label,
            coding: [
              {
                system: "http://hl7.org/fhir/sid/icd-10-cm",
                code: condition.code,
                display: condition.label,
              },
            ],
          },
        },
      })),
    );

    return {
      resourceType: "Bundle",
      type: "searchset",
      total: entries.length,
      entry: entries,
    };
  },

  getAppointments(patientId) {
    ensureStubAllowed();
    const entries = getMatches(patientId).map((match) => ({
      resource: {
        resourceType: "Appointment" as const,
        id: `${match.id}-appointment`,
        status: "booked" as const,
        description: match.appointmentLabel,
        start: match.appointmentIso,
        participant: [
          {
            actor: {
              display: match.provider,
            },
          },
        ],
      },
    }));

    return {
      resourceType: "Bundle",
      type: "searchset",
      total: entries.length,
      entry: entries,
    };
  },
};
