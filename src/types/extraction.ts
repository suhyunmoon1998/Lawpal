export type EmailExtractionResult = {
  caseName: string;
  caseNumber: string;
  court: string;
  judge: string;
  department: string;
  senderRole: string;
  documentType: string;
  serviceDate: string;
  serviceMethod: string;
  possibleDeadlineTriggers: string[];
  attachments: string[];
  recommendedActions: string[];
  confidenceScore: number;
  needsAttorneyReview: true;
};
