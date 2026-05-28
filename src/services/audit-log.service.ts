import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type AppApprovalStatus =
  | "AUTO_DETECTED"
  | "AI_DRAFT"
  | "ATTORNEY_REVIEW_REQUIRED"
  | "ATTORNEY_APPROVED"
  | "LOCKED_FOR_COURT_USE"
  | "REJECTED"
  | "NEEDS_CORRECTION";

type AuditLogInput = {
  lawFirmId: string;
  actorUserId?: string;
  actionType: string;
  sourceEntityType: string;
  sourceEntityId: string;
  sourceEmailId?: string;
  sourceDocumentId?: string;
  legalRuleSourceId?: string;
  approvalStatus?: AppApprovalStatus;
  beforeValue?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  afterValue?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
};

export async function recordAuditLog(input: AuditLogInput) {
  return prisma.auditLog.create({
    data: input
  });
}
