type ExtractionLike = {
  serviceDate?: string;
  serviceMethod?: string;
  possibleDeadlineTriggers?: string[];
};

export type DeadlineCandidate = {
  triggerLabel: string;
  deadlineRuleTriggerType: string;
  calendarTitle: string;
};

export function detectDeadlineCandidates(input: {
  subject: string;
  bodyText?: string | null;
  extraction?: ExtractionLike | null;
}) {
  const haystack = `${input.subject}\n${input.bodyText ?? ""}`.toLowerCase();
  const extractedTriggers = (input.extraction?.possibleDeadlineTriggers ?? []).join(" ").toLowerCase();
  const candidates: DeadlineCandidate[] = [];

  if (
    /notice of motion|motion for|summary judgment|opposition|reply brief/.test(haystack) ||
    extractedTriggers.includes("motion")
  ) {
    candidates.push({
      triggerLabel: "Motion service detected",
      deadlineRuleTriggerType: "MOTION_OPPOSITION_DETECTED",
      calendarTitle: "Motion-related response due (draft)"
    });
  }

  if (
    /initial disclosure|rule 26|discovery plan|meet and confer/.test(haystack) ||
    extractedTriggers.includes("discovery")
  ) {
    candidates.push({
      triggerLabel: "Discovery event detected",
      deadlineRuleTriggerType: "INITIAL_DISCLOSURE_DETECTED",
      calendarTitle: "Discovery follow-up due (draft)"
    });
  }

  return candidates;
}
