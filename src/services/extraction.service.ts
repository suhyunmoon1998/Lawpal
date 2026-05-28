import type { EmailExtractionResult } from "@/types/extraction";

export function buildStructuredExtraction(input: {
  subject: string;
  bodyText?: string | null;
  attachmentNames?: string[];
}): EmailExtractionResult {
  const body = input.bodyText ?? "";
  const hasMotion = /motion|opposition|reply/i.test(`${input.subject} ${body}`);
  const serviceMethod = /email/i.test(body) ? "Electronic Service" : "";

  return {
    caseName: "",
    caseNumber: "",
    court: "",
    judge: "",
    department: "",
    senderRole: "",
    documentType: hasMotion ? "Motion-related correspondence" : "General correspondence",
    serviceDate: "",
    serviceMethod,
    possibleDeadlineTriggers: hasMotion ? ["Motion opposition or reply timing review"] : [],
    attachments: input.attachmentNames ?? [],
    recommendedActions: [
      "Assign to case if confidence is low",
      "Review detected legal triggers",
      "Confirm service date and service method"
    ],
    confidenceScore: hasMotion ? 0.76 : 0.42,
    needsAttorneyReview: true
  };
}
