export type CoverageStatus = "VERIFIED_ACTIVE" | "SEEDED_STRUCTURE" | "PLANNED";
export type SourceFamily = "FEDERAL" | "STATE" | "LOCAL" | "PROVIDER";

export type LegalSourceRegistryEntry = {
  slug: string;
  title: string;
  jurisdictionLabel: string;
  sourceFamily: SourceFamily;
  status: CoverageStatus;
  notes: string;
};

const stateNames = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming"
] as const;

export const sourceRegistry: LegalSourceRegistryEntry[] = [
  {
    slug: "federal-rules-civil-procedure",
    title: "Federal Rules of Civil Procedure",
    jurisdictionLabel: "Federal",
    sourceFamily: "FEDERAL",
    status: "SEEDED_STRUCTURE",
    notes: "Priority pack for nationwide deadline logic and federal motion practice."
  },
  {
    slug: "federal-rules-evidence",
    title: "Federal Rules of Evidence",
    jurisdictionLabel: "Federal",
    sourceFamily: "FEDERAL",
    status: "PLANNED",
    notes: "Source pack scaffolded for evidentiary deadlines and hearing prep references."
  },
  {
    slug: "us-code",
    title: "United States Code",
    jurisdictionLabel: "Federal",
    sourceFamily: "FEDERAL",
    status: "PLANNED",
    notes: "Statutory source structure only until title-by-title import adapters are added."
  },
  {
    slug: "central-district-california-local-rules",
    title: "Central District of California Local Rules",
    jurisdictionLabel: "Federal Local",
    sourceFamily: "LOCAL",
    status: "SEEDED_STRUCTURE",
    notes: "Local federal motion practice and calendaring structure prepared for verified import."
  },
  {
    slug: "los-angeles-superior-court-local-rules",
    title: "Los Angeles Superior Court Local Rules",
    jurisdictionLabel: "California Local",
    sourceFamily: "LOCAL",
    status: "SEEDED_STRUCTURE",
    notes: "High-priority local-rule scaffold for California state litigation."
  },
  {
    slug: "judge-department-rules",
    title: "Judge and Department-Specific Rules",
    jurisdictionLabel: "Courtroom Specific",
    sourceFamily: "LOCAL",
    status: "PLANNED",
    notes: "Reserved for uploaded or officially published department procedures only."
  },
  {
    slug: "jams-rules",
    title: "JAMS Arbitration Rules",
    jurisdictionLabel: "Private Provider",
    sourceFamily: "PROVIDER",
    status: "PLANNED",
    notes: "Only enabled after upload or attorney-confirmed official source ingestion."
  },
  {
    slug: "aaa-rules",
    title: "AAA Arbitration Rules",
    jurisdictionLabel: "Private Provider",
    sourceFamily: "PROVIDER",
    status: "PLANNED",
    notes: "Provider rules remain inactive until the source is uploaded or verified."
  },
  ...stateNames.map((state) => ({
    slug: `${state.toLowerCase().replaceAll(" ", "-")}-state-pack`,
    title: `${state} State Rules Pack`,
    jurisdictionLabel: state,
    sourceFamily: "STATE" as const,
    status: (state === "California" ? "SEEDED_STRUCTURE" : "PLANNED") as CoverageStatus,
    notes:
      state === "California"
        ? "California state-law structure seeded first because current MVP deadlines target California firms."
        : "State-level scaffold reserved for official rules, statutes, and local practice imports."
  }))
];

export const importScaffoldSteps = [
  {
    title: "Register official source",
    detail: "Add the court, legislature, or provider source pack before any rule text is imported."
  },
  {
    title: "Normalize and version",
    detail: "Store citation, effective date, verification date, and source lineage for each imported rule."
  },
  {
    title: "Map trigger logic",
    detail: "Connect verified rule records to deadline triggers without treating any AI output as final."
  },
  {
    title: "Attorney verify before use",
    detail: "No pack becomes active for drafting or calendaring until an attorney confirms the source set."
  }
] as const;
