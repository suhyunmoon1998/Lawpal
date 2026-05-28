import { prisma } from "@/lib/prisma";
import { DRAFT_WARNING } from "@/lib/constants";
import { recordAuditLog } from "@/services/audit-log.service";

type CreateVersionInput = {
  documentId: string;
  content: string;
  generatedFromEmailIds: string[];
  generatedFromAttachmentIds: string[];
  legalRuleSourceIds: string[];
  changeSummary: string;
  actorUserId?: string;
  lawFirmId: string;
};

export async function createDraftDocumentVersion(input: CreateVersionInput) {
  const latest = await prisma.caseDocumentVersion.findFirst({
    where: { documentId: input.documentId },
    orderBy: { versionNumber: "desc" }
  });

  const version = await prisma.caseDocumentVersion.create({
    data: {
      documentId: input.documentId,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      content: `${DRAFT_WARNING}\n\n${input.content}`,
      generatedFromEmailIds: input.generatedFromEmailIds,
      generatedFromAttachmentIds: input.generatedFromAttachmentIds,
      changeSummary: input.changeSummary,
      legalRuleSources: {
        connect: input.legalRuleSourceIds.map((id) => ({ id }))
      },
      changeLogs: {
        create: {
          summary: input.changeSummary,
          beforeContent: latest?.content,
          afterContent: `${DRAFT_WARNING}\n\n${input.content}`,
          status: "ATTORNEY_REVIEW_REQUIRED"
        }
      }
    },
    include: {
      changeLogs: true,
      legalRuleSources: true
    }
  });

  await prisma.caseDocument.update({
    where: { id: input.documentId },
    data: { latestVersionId: version.id }
  });

  await recordAuditLog({
    lawFirmId: input.lawFirmId,
    actorUserId: input.actorUserId,
    actionType: "DOCUMENT_VERSION_CREATED",
    sourceEntityType: "CaseDocumentVersion",
    sourceEntityId: version.id,
    sourceDocumentId: input.documentId,
    approvalStatus: "ATTORNEY_REVIEW_REQUIRED",
    beforeValue: latest?.content,
    afterValue: version.content
  });

  return version;
}
