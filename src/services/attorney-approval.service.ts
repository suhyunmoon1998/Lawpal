import { canApprove } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/services/audit-log.service";
import type { AppUserRole } from "@/lib/auth";

type AppApprovalStatus =
  | "AUTO_DETECTED"
  | "AI_DRAFT"
  | "ATTORNEY_REVIEW_REQUIRED"
  | "ATTORNEY_APPROVED"
  | "LOCKED_FOR_COURT_USE"
  | "REJECTED"
  | "NEEDS_CORRECTION";

type ApprovalTargetType = "DRAFT_DEADLINE" | "CASE_DOCUMENT_VERSION" | "CALENDAR_EVENT";

type ApprovalInput = {
  actorUserId: string;
  actorRole: AppUserRole;
  lawFirmId: string;
  targetId: string;
  targetType: ApprovalTargetType;
  decision: AppApprovalStatus;
  comment?: string;
};

export async function decideApproval(input: ApprovalInput) {
  if (!canApprove(input.actorRole)) {
    throw new Error("Only attorneys or firm admins can finalize approvals.");
  }

  const approval = await prisma.attorneyApproval.create({
    data: {
      actorUserId: input.actorUserId,
      targetId: input.targetId,
      targetType: input.targetType,
      status: input.decision,
      comment: input.comment
    }
  });

  if (input.targetType === "DRAFT_DEADLINE") {
    await prisma.draftDeadline.update({
      where: { id: input.targetId },
      data: {
        status:
          input.decision === "ATTORNEY_APPROVED"
            ? "APPROVED"
            : input.decision === "REJECTED"
              ? "REJECTED"
              : "ATTORNEY_REVIEW_REQUIRED",
        approvedById: input.decision === "ATTORNEY_APPROVED" ? input.actorUserId : null,
        approvedAt: input.decision === "ATTORNEY_APPROVED" ? new Date() : null
      }
    });

    if (input.decision === "ATTORNEY_APPROVED") {
      await prisma.calendarEvent.updateMany({
        where: { draftDeadlineId: input.targetId },
        data: {
          approvalStatus: "ATTORNEY_APPROVED",
          status: "APPROVED_INTERNAL"
        }
      });
    }
  }

  if (input.targetType === "CASE_DOCUMENT_VERSION") {
    await prisma.caseDocumentVersion.update({
      where: { id: input.targetId },
      data: {
        status:
          input.decision === "ATTORNEY_APPROVED"
            ? "ATTORNEY_APPROVED"
            : input.decision === "LOCKED_FOR_COURT_USE"
              ? "LOCKED_FOR_COURT_USE"
              : "REJECTED",
        approvedById:
          input.decision === "ATTORNEY_APPROVED" || input.decision === "LOCKED_FOR_COURT_USE"
            ? input.actorUserId
            : null,
        approvedAt:
          input.decision === "ATTORNEY_APPROVED" || input.decision === "LOCKED_FOR_COURT_USE"
            ? new Date()
            : null
      }
    });
  }

  if (input.targetType === "CALENDAR_EVENT") {
    await prisma.calendarEvent.update({
      where: { id: input.targetId },
      data: {
        approvalStatus: input.decision,
        status: input.decision === "ATTORNEY_APPROVED" ? "APPROVED_INTERNAL" : "REJECTED"
      }
    });
  }

  await recordAuditLog({
    lawFirmId: input.lawFirmId,
    actorUserId: input.actorUserId,
    actionType: `APPROVAL_${input.decision}`,
    sourceEntityType: input.targetType,
    sourceEntityId: input.targetId,
    approvalStatus: input.decision
  });

  return approval;
}
