import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { gunzip } from "node:zlib";

const SOURCE_VERSION = "2.1.0";
const SOURCE_BASE_URL = `https://physionet.org/files/mimic-iv-fhir-demo/${SOURCE_VERSION}/fhir`;
const SOURCE_LABEL = `MIMIC-IV Clinical Database Demo on FHIR v${SOURCE_VERSION}`;

const RESOURCE_FILES = {
  patients: "MimicPatient.ndjson.gz",
  encounters: "MimicEncounter.ndjson.gz",
  conditions: "MimicCondition.ndjson.gz",
  locations: "MimicLocation.ndjson.gz",
  organizations: "MimicOrganization.ndjson.gz",
};

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const serverDataDir = resolve(repoRoot, "src/server/data/public");
const sharedDir = resolve(repoRoot, "src/shared");
const outputIndexFile = resolve(serverDataDir, "mimic-demo-index.ts");
const outputMetaFile = resolve(sharedDir, "public-dataset-meta.ts");
const gunzipAsync = promisify(gunzip);

function assertNever(message) {
  throw new Error(message);
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function initialsFor(name, patientIdentifier) {
  const parts = name.split(/[^a-z0-9]+/i).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `P${String(patientIdentifier).slice(-1)}`.toUpperCase();
}

function displayNameFor(patient) {
  return (
    patient.name?.[0]?.text ??
    patient.name?.[0]?.family ??
    patient.identifier?.[0]?.value ??
    `Patient_${patient.id}`
  );
}

function patientIdentifierFor(patient) {
  return patient.identifier?.[0]?.value ?? patient.id;
}

function conditionAliasesFor(label, code) {
  const normalizedLabel = normalizeText(label);
  const aliases = new Set([normalizedLabel]);

  if (code) {
    aliases.add(code.toLowerCase());
  }

  if (normalizedLabel.includes("diabetes")) {
    aliases.add("diabetes");
    aliases.add("diabetes mellitus");
    aliases.add("dm");
    if (normalizedLabel.includes("type 2") || normalizedLabel.includes("type ii")) {
      aliases.add("type 2 diabetes");
      aliases.add("type 2 dm");
      aliases.add("t2dm");
    }
  }

  if (normalizedLabel.includes("hypertension")) {
    aliases.add("hypertension");
  }

  if (normalizedLabel.includes("kidney")) {
    aliases.add("kidney disease");
  }

  if (normalizedLabel.includes("hyperlipidemia") || normalizedLabel.includes("hypercholesterolemia")) {
    aliases.add("hyperlipidemia");
    aliases.add("cholesterol");
  }

  return [...aliases];
}

function formatDateRange(start, end) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const startLabel = start ? formatter.format(new Date(start)) : "Unknown start";
  const endLabel = end ? formatter.format(new Date(end)) : null;

  return endLabel ? `${startLabel} to ${endLabel}` : startLabel;
}

function formatEncounterLabel(record) {
  const segments = [
    record.locationName,
    formatDateRange(record.encounterStart, record.encounterEnd),
    record.encounterClass,
    record.encounterService,
  ].filter(Boolean);

  return segments.join(" | ");
}

function pickStatusBadge(status) {
  if (status === "finished") {
    return { label: "Finished", tone: "green" };
  }

  if (status === "in-progress") {
    return { label: "Active", tone: "amber" };
  }

  return { label: "Encounter", tone: "green" };
}

function compactLocationLabel(locationName) {
  const stripped = locationName.replace(/ \([^)]+\)$/, "");
  if (stripped === "Emergency Department Observation") {
    return "ED Obs";
  }

  if (stripped === "Emergency Department") {
    return "Emergency";
  }

  return stripped.length > 18 ? `${stripped.slice(0, 18)}…` : stripped;
}

async function fetchNdjson(fileName) {
  const response = await fetch(`${SOURCE_BASE_URL}/${fileName}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${fileName}: ${response.status} ${response.statusText}`);
  }

  const compressed = Buffer.from(await response.arrayBuffer());
  const text = (await gunzipAsync(compressed)).toString("utf8").trim();
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function pickDefaultQuery(records) {
  const diabetesLocationCounts = new Map();

  for (const record of records) {
    const hasDiabetes = record.conditions.some((condition) =>
      condition.aliases.includes("diabetes"),
    );

    if (!hasDiabetes) {
      continue;
    }

    diabetesLocationCounts.set(
      record.locationName,
      (diabetesLocationCounts.get(record.locationName) ?? 0) + 1,
    );
  }

  const topLocation =
    [...diabetesLocationCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ??
    records[0]?.locationName;

  if (!topLocation) {
    assertNever("Unable to derive a default location from the public dataset.");
  }

  return {
    defaultCondition: "diabetes",
    defaultLocation: topLocation,
    defaultQuery: `Patients with diabetes in the ${topLocation}`,
  };
}

function buildNormalizedRecords({ patients, encounters, conditions, locations, organizations }) {
  const patientsById = new Map(patients.map((patient) => [patient.id, patient]));
  const locationsById = new Map(locations.map((location) => [location.id, location]));
  const organizationsById = new Map(
    organizations.map((organization) => [organization.id, organization]),
  );
  const conditionsByEncounter = new Map();

  for (const condition of conditions) {
    const encounterId = condition.encounter?.reference?.split("/")[1];
    if (!encounterId) {
      continue;
    }

    const current = conditionsByEncounter.get(encounterId) ?? [];
    current.push(condition);
    conditionsByEncounter.set(encounterId, current);
  }

  const records = [];

  for (const encounter of encounters) {
    const patientId = encounter.subject?.reference?.split("/")[1];
    if (!patientId) {
      continue;
    }

    const patient = patientsById.get(patientId);
    if (!patient) {
      continue;
    }

    const encounterConditions = (conditionsByEncounter.get(encounter.id) ?? [])
      .map((condition) => {
        const coding = condition.code?.coding?.[0];
        const label = coding?.display ?? condition.code?.text ?? "Unlabeled condition";
        const code = coding?.code ?? null;

        return {
          label,
          code,
          aliases: conditionAliasesFor(label, code),
        };
      })
      .sort((left, right) => left.label.localeCompare(right.label));

    if (!encounterConditions.length) {
      continue;
    }

    const locationId = encounter.location?.[0]?.location?.reference?.split("/")[1] ?? null;
    const location = locationId ? locationsById.get(locationId) : null;

    const organizationId =
      encounter.serviceProvider?.reference?.split("/")[1] ??
      location?.managingOrganization?.reference?.split("/")[1] ??
      patient.managingOrganization?.reference?.split("/")[1] ??
      null;
    const organization = organizationId ? organizationsById.get(organizationId) : null;

    const patientIdentifier = patientIdentifierFor(patient);
    const name = displayNameFor(patient);
    const locationName = location?.name ?? organization?.name ?? "Hospital encounter";

    const record = {
      id: `${patient.id}:${encounter.id}`,
      patientId: patient.id,
      patientIdentifier,
      name,
      initials: initialsFor(name, patientIdentifier),
      dob: patient.birthDate ?? null,
      organizationId,
      organizationName: organization?.name ?? "Unknown organization",
      locationId,
      locationName,
      encounterId: encounter.id,
      encounterIdentifier: encounter.identifier?.[0]?.value ?? encounter.id,
      encounterStatus: encounter.status ?? "unknown",
      encounterClass:
        encounter.class?.display ?? encounter.class?.code ?? encounter.priority?.coding?.[0]?.display ?? null,
      encounterService: encounter.serviceType?.coding?.[0]?.display ?? encounter.serviceType?.coding?.[0]?.code ?? null,
      encounterStart: encounter.period?.start ?? null,
      encounterEnd: encounter.period?.end ?? null,
      encounterLabel: "",
      badges: [],
      conditions: encounterConditions,
      provenance: {
        patientRef: `Patient/${patient.id}`,
        encounterRef: `Encounter/${encounter.id}`,
        organizationRef: organizationId ? `Organization/${organizationId}` : null,
        locationRef: locationId ? `Location/${locationId}` : null,
        conditionRefs: (conditionsByEncounter.get(encounter.id) ?? []).map(
          (condition) => `Condition/${condition.id}`,
        ),
      },
    };

    record.encounterLabel = formatEncounterLabel(record);
    record.badges = [
      pickStatusBadge(record.encounterStatus),
      {
        label: compactLocationLabel(record.locationName),
        tone: "blue",
      },
      ...(record.encounterService
        ? [
            {
              label: String(record.encounterService),
              tone: "amber",
            },
          ]
        : []),
    ];

    records.push(record);
  }

  return records.sort((left, right) =>
    (right.encounterStart ?? "").localeCompare(left.encounterStart ?? ""),
  );
}

async function main() {
  await mkdir(serverDataDir, { recursive: true });
  await mkdir(sharedDir, { recursive: true });

  const [patients, encounters, conditions, locations, organizations] = await Promise.all([
    fetchNdjson(RESOURCE_FILES.patients),
    fetchNdjson(RESOURCE_FILES.encounters),
    fetchNdjson(RESOURCE_FILES.conditions),
    fetchNdjson(RESOURCE_FILES.locations),
    fetchNdjson(RESOURCE_FILES.organizations),
  ]);

  const records = buildNormalizedRecords({
    patients,
    encounters,
    conditions,
    locations,
    organizations,
  });
  const defaults = pickDefaultQuery(records);
  const availableLocations = [...new Set(records.map((record) => record.locationName))].sort();
  const availableOrganizations = [
    ...new Set(records.map((record) => record.organizationName)),
  ].sort();

  const index = {
    datasetLabel: SOURCE_LABEL,
    sourceVersion: SOURCE_VERSION,
    sourceBaseUrl: SOURCE_BASE_URL,
    generatedAt: new Date().toISOString(),
    defaultQuery: defaults.defaultQuery,
    defaultFilters: {
      condition: defaults.defaultCondition,
      location: defaults.defaultLocation,
    },
    availableLocations,
    availableOrganizations,
    sourceCounts: {
      patients: patients.length,
      encounters: encounters.length,
      conditions: conditions.length,
      locations: locations.length,
      organizations: organizations.length,
    },
    records,
  };

  const indexModule = `// @ts-nocheck\n/* eslint-disable */\n/* This file is auto-generated by scripts/import-public-fhir.mjs. */\nexport const MIMIC_DEMO_INDEX = ${JSON.stringify(index, null, 2)} as const;\n`;
  const metaModule = `// @ts-nocheck\n/* eslint-disable */\n/* This file is auto-generated by scripts/import-public-fhir.mjs. */\nexport const PUBLIC_DATASET_LABEL = ${JSON.stringify(SOURCE_LABEL)};\nexport const PUBLIC_DATASET_VERSION = ${JSON.stringify(SOURCE_VERSION)};\nexport const PUBLIC_DATA_DEFAULT_QUERY = ${JSON.stringify(defaults.defaultQuery)};\nexport const PUBLIC_DATA_DEFAULT_FILTERS = ${JSON.stringify(defaults, null, 2)} as const;\nexport const PUBLIC_DATASET_LOCATIONS = ${JSON.stringify(availableLocations, null, 2)} as const;\nexport type PublicDatasetLocation = (typeof PUBLIC_DATASET_LOCATIONS)[number];\nexport const PUBLIC_DATASET_ORGANIZATIONS = ${JSON.stringify(availableOrganizations, null, 2)} as const;\n`;

  await writeFile(outputIndexFile, indexModule, "utf8");
  await writeFile(outputMetaFile, metaModule, "utf8");

  console.log(
    `Generated ${outputIndexFile} and ${outputMetaFile} from ${SOURCE_LABEL} (${records.length} encounter records).`,
  );
}

await main();
