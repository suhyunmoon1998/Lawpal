export const DRAFT_WARNING =
  "Draft generated from case emails, attachments, and verified rule sources. Not approved for filing, service, or court use until reviewed and approved by an attorney.";

export const DEADLINE_WARNING =
  "System detected a possible deadline based on the source email/document and a verified rule. Attorney approval is required before use.";

export const REVIEW_REQUIRED_STATUSES = {
  draftDeadline: "ATTORNEY_REVIEW_REQUIRED",
  calendarEvent: "ATTORNEY_REVIEW_REQUIRED",
  caseDocumentVersion: "ATTORNEY_REVIEW_REQUIRED"
} as const;

export const LIVING_DOCUMENT_TYPES = [
  "Case Status Summary",
  "Procedural History",
  "Discovery Timeline",
  "Deadline Report",
  "Meet-and-Confer History",
  "Court Filing and Hearing Log",
  "Draft Declaration Timeline",
  "Potential Motion Outline"
] as const;
