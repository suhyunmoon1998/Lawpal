import { DRAFT_WARNING, DEADLINE_WARNING } from "@/lib/constants";

export const demoReviewQueue = {
  newEmailsNeedingCaseAssignment: 7,
  detectedDeadlineTriggers: 3,
  documentUpdatesNeedingApproval: 9,
  calendarEventsNeedingApproval: 4,
  uncertainLegalRuleMatches: 2,
  emailsWithAttachments: 5,
  followUpTasks: 6,
  rejectedItemsNeedingCorrection: 1
};

export const demoCases = [
  {
    id: "case-1",
    name: "Lopez v. Horizon Manufacturing",
    caseNumber: "24STCV10811",
    court: "Los Angeles Superior Court",
    judge: "Hon. Elena Ruiz",
    department: "Dept. 52",
    status: "ACTIVE",
    warning: DRAFT_WARNING
  },
  {
    id: "case-2",
    name: "Kim v. Pacific Tech Systems",
    caseNumber: "2:26-cv-01420",
    court: "C.D. California",
    judge: "Hon. David H. Lee",
    department: "Courtroom 7B",
    status: "ACTIVE",
    warning: DRAFT_WARNING
  }
] as const;

export const demoDeadlines = [
  {
    id: "deadline-1",
    title: "Opposition due",
    caseName: "Lopez v. Horizon Manufacturing",
    dueDate: "2026-05-27",
    rule: "Cal. Code Civ. Proc. § 1005",
    status: "Attorney Review Required",
    warning: DEADLINE_WARNING
  },
  {
    id: "deadline-2",
    title: "Initial disclosures review",
    caseName: "Kim v. Pacific Tech Systems",
    dueDate: "2026-05-28",
    rule: "Fed. R. Civ. P. 26",
    status: "Auto Detected",
    warning: DEADLINE_WARNING
  }
] as const;
