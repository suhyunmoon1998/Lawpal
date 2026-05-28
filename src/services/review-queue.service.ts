import { prisma } from "@/lib/prisma";

export async function getTodayReviewQueue(lawFirmId: string) {
  const [
    unassignedEmails,
    deadlineTriggers,
    documentUpdates,
    calendarItems,
    uncertainLegalRuleMatches,
    emailsWithAttachments,
    followUpTasks,
    rejectedApprovals
  ] = await Promise.all([
    prisma.emailMessage.count({
      where: { lawFirmId, reviewStatus: "UNASSIGNED" }
    }),
    prisma.draftDeadline.count({
      where: { caseMatter: { lawFirmId }, status: { in: ["AUTO_DETECTED", "ATTORNEY_REVIEW_REQUIRED"] } }
    }),
    prisma.caseDocumentVersion.count({
      where: { document: { caseMatter: { lawFirmId } }, status: "ATTORNEY_REVIEW_REQUIRED" }
    }),
    prisma.calendarEvent.count({
      where: { lawFirmId, approvalStatus: "ATTORNEY_REVIEW_REQUIRED" }
    }),
    prisma.deadlineTrigger.count({
      where: {
        caseMatter: { lawFirmId },
        OR: [{ deadlineRuleId: null }, { confidenceScore: { lt: 0.75 } }]
      }
    }),
    prisma.emailMessage.count({
      where: {
        lawFirmId,
        hasAttachments: true,
        reviewStatus: { in: ["UNASSIGNED", "REVIEW_REQUIRED", "ASSIGNED"] }
      }
    }),
    prisma.task.count({
      where: { lawFirmId, status: { in: ["OPEN", "IN_PROGRESS", "BLOCKED"] } }
    }),
    prisma.attorneyApproval.count({
      where: { actor: { lawFirmId }, status: { in: ["REJECTED", "NEEDS_CORRECTION"] } }
    })
  ]);

  return {
    newEmailsNeedingCaseAssignment: unassignedEmails,
    detectedDeadlineTriggers: deadlineTriggers,
    documentUpdatesNeedingApproval: documentUpdates,
    calendarEventsNeedingApproval: calendarItems,
    uncertainLegalRuleMatches,
    emailsWithAttachments,
    followUpTasks,
    rejectedItemsNeedingCorrection: rejectedApprovals
  };
}
