import type { SearchMatch } from "../../../validation-schema";

type RawMember = {
  id: string;
  name: string;
  dob: string;
  mrn: string;
  siteId: string;
  siteName: string;
  provider: string;
  payer: string;
  appointmentHour: number;
  appointmentMinute: number;
  conditions: Array<{
    label: string;
    code: string;
    aliases: string[];
  }>;
  extraBadges?: SearchMatch["badges"];
  extraExplanation?: SearchMatch["explanations"];
};

const SPRINGFIELD_SITE = {
  siteId: "site-4021",
  siteName: "Springfield Family Medicine",
};

const NORTH_SITE = {
  siteId: "site-1108",
  siteName: "North Campus Primary Care",
};

function getNextTuesday(fromDate = new Date()) {
  const date = new Date(fromDate);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const delta = ((2 - day + 7) % 7 || 7);
  date.setDate(date.getDate() + delta);
  return date;
}

function atTime(baseDate: Date, hour: number, minute: number) {
  const date = new Date(baseDate);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function formatAppointmentLabel(date: Date, provider: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const lookup = new Map(parts.map((part) => [part.type, part.value]));
  return `${lookup.get("weekday")} ${lookup.get("month")} ${lookup.get("day")} ${lookup.get("hour")}:${lookup.get("minute")} ${lookup.get("dayPeriod")} with ${provider}`;
}

function initialsFor(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function buildExplanations(member: RawMember, appointmentLabel: string): SearchMatch["explanations"] {
  const primaryCondition = member.conditions[0];

  const base: SearchMatch["explanations"] = [
    {
      tone: "teal",
      text: `Condition match: ${primaryCondition.code} ${primaryCondition.label}`,
      source: "EHR",
    },
    {
      tone: "purple",
      text: `Location match: ${member.siteName}`,
      source: "Scheduling",
    },
    {
      tone: "amber",
      text: `Appointment: ${appointmentLabel}`,
      source: "Scheduling",
    },
  ];

  if (member.extraExplanation) {
    base.push(...member.extraExplanation);
  }

  return base;
}

function mapMemberToMatch(member: RawMember, nextTuesday: Date): SearchMatch {
  const appointment = atTime(nextTuesday, member.appointmentHour, member.appointmentMinute);
  const appointmentLabel = formatAppointmentLabel(appointment, member.provider);

  return {
    id: member.id,
    initials: initialsFor(member.name),
    name: member.name,
    dob: member.dob,
    mrn: member.mrn,
    siteId: member.siteId,
    siteName: member.siteName,
    provider: member.provider,
    payer: member.payer,
    conditions: member.conditions,
    appointmentIso: appointment.toISOString(),
    appointmentLabel,
    badges: member.extraBadges ?? [
      { label: "Active", tone: "green" },
      { label: "Appt Tue", tone: "blue" },
    ],
    explanations: buildExplanations(member, appointmentLabel),
  };
}

export function getSyntheticMatches(): SearchMatch[] {
  const nextTuesday = getNextTuesday();

  const diabetesAliases = ["diabetes", "diabetic", "dm", "type 2 diabetes"];

  const rawMembers: RawMember[] = [
    {
      id: "member-001",
      name: "James Mitchell",
      dob: "1958-03-14",
      mrn: "90281",
      provider: "Dr. Patel",
      payer: "Aetna",
      appointmentHour: 9,
      appointmentMinute: 30,
      conditions: [{ label: "Type 2 diabetes mellitus", code: "E11.9", aliases: diabetesAliases }],
      ...SPRINGFIELD_SITE,
    },
    {
      id: "member-002",
      name: "Sofia Reyes",
      dob: "1971-11-02",
      mrn: "44019",
      provider: "Dr. Chen",
      payer: "Blue Cross",
      appointmentHour: 10,
      appointmentMinute: 15,
      conditions: [{ label: "Type 2 DM with hyperglycemia", code: "E11.65", aliases: diabetesAliases }],
      ...SPRINGFIELD_SITE,
    },
    {
      id: "member-003",
      name: "Robert Banks",
      dob: "1965-07-28",
      mrn: "77503",
      provider: "Dr. Patel",
      payer: "Aetna",
      appointmentHour: 14,
      appointmentMinute: 0,
      conditions: [{ label: "Type 2 DM with polyneuropathy", code: "E11.42", aliases: diabetesAliases }],
      extraBadges: [
        { label: "Active", tone: "green" },
        { label: "PA pending", tone: "amber" },
      ],
      extraExplanation: [
        {
          tone: "amber",
          text: "Prior auth pending for CGM device",
          source: "Payer",
        },
      ],
      ...SPRINGFIELD_SITE,
    },
    {
      id: "member-004",
      name: "Maria Spencer",
      dob: "1980-06-12",
      mrn: "73108",
      provider: "Dr. Patel",
      payer: "Cigna",
      appointmentHour: 8,
      appointmentMinute: 45,
      conditions: [{ label: "Type 2 diabetes mellitus", code: "E11.9", aliases: diabetesAliases }],
      ...SPRINGFIELD_SITE,
    },
    {
      id: "member-005",
      name: "Elaine Warren",
      dob: "1968-09-23",
      mrn: "25047",
      provider: "Dr. Chen",
      payer: "Aetna",
      appointmentHour: 11,
      appointmentMinute: 20,
      conditions: [{ label: "Type 2 diabetes mellitus", code: "E11.9", aliases: diabetesAliases }],
      ...SPRINGFIELD_SITE,
    },
    {
      id: "member-006",
      name: "Terrence Hall",
      dob: "1959-01-16",
      mrn: "11892",
      provider: "Dr. Patel",
      payer: "Blue Cross",
      appointmentHour: 13,
      appointmentMinute: 40,
      conditions: [{ label: "Type 2 diabetes with CKD", code: "E11.22", aliases: diabetesAliases }],
      ...SPRINGFIELD_SITE,
    },
    {
      id: "member-007",
      name: "Angela Kim",
      dob: "1976-04-19",
      mrn: "82216",
      provider: "Dr. Chen",
      payer: "Cigna",
      appointmentHour: 15,
      appointmentMinute: 10,
      conditions: [{ label: "Type 2 diabetes mellitus", code: "E11.9", aliases: diabetesAliases }],
      ...SPRINGFIELD_SITE,
    },
    {
      id: "member-008",
      name: "Oscar Sutton",
      dob: "1962-10-05",
      mrn: "66731",
      provider: "Dr. Patel",
      payer: "Aetna",
      appointmentHour: 16,
      appointmentMinute: 5,
      conditions: [{ label: "Type 2 diabetes mellitus", code: "E11.9", aliases: diabetesAliases }],
      ...SPRINGFIELD_SITE,
    },
    {
      id: "member-009",
      name: "Priya Nair",
      dob: "1984-02-11",
      mrn: "31843",
      provider: "Dr. Chen",
      payer: "Blue Cross",
      appointmentHour: 8,
      appointmentMinute: 5,
      conditions: [{ label: "Type 2 DM with hyperglycemia", code: "E11.65", aliases: diabetesAliases }],
      ...SPRINGFIELD_SITE,
    },
    {
      id: "member-010",
      name: "Lydia Bell",
      dob: "1973-08-30",
      mrn: "20411",
      provider: "Dr. Patel",
      payer: "Aetna",
      appointmentHour: 12,
      appointmentMinute: 35,
      conditions: [{ label: "Type 2 diabetes mellitus", code: "E11.9", aliases: diabetesAliases }],
      ...SPRINGFIELD_SITE,
    },
    {
      id: "member-011",
      name: "Marcus Yates",
      dob: "1961-12-18",
      mrn: "58972",
      provider: "Dr. Chen",
      payer: "Blue Cross",
      appointmentHour: 14,
      appointmentMinute: 25,
      conditions: [{ label: "Type 2 DM with neuropathy", code: "E11.40", aliases: diabetesAliases }],
      ...SPRINGFIELD_SITE,
    },
    {
      id: "member-012",
      name: "Donna Flores",
      dob: "1978-05-27",
      mrn: "44620",
      provider: "Dr. Patel",
      payer: "Cigna",
      appointmentHour: 15,
      appointmentMinute: 45,
      conditions: [{ label: "Type 2 diabetes mellitus", code: "E11.9", aliases: diabetesAliases }],
      ...SPRINGFIELD_SITE,
    },
    {
      id: "member-101",
      name: "Henry Doyle",
      dob: "1969-07-07",
      mrn: "19255",
      provider: "Dr. Rao",
      payer: "Aetna",
      appointmentHour: 9,
      appointmentMinute: 0,
      conditions: [{ label: "Chronic heart failure", code: "I50.9", aliases: ["chf", "heart failure"] }],
      ...NORTH_SITE,
    },
    {
      id: "member-102",
      name: "Carmen Diaz",
      dob: "1970-01-25",
      mrn: "29077",
      provider: "Dr. Rao",
      payer: "United",
      appointmentHour: 11,
      appointmentMinute: 10,
      conditions: [{ label: "COPD", code: "J44.9", aliases: ["copd", "emphysema"] }],
      ...NORTH_SITE,
    },
  ];

  return rawMembers.map((member) => mapMemberToMatch(member, nextTuesday));
}
