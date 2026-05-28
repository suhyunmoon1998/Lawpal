import { prisma } from "@/lib/prisma";
import { DEADLINE_WARNING } from "@/lib/constants";
import { calculateDraftDeadline } from "@/services/deadline-calculation.service";
import { recordAuditLog } from "@/services/audit-log.service";
import { detectDeadlineCandidates } from "@/services/deadline-detection";

type ExtractionLike = {
  serviceDate?: string;
  serviceMethod?: string;
  possibleDeadlineTriggers?: string[];
};

function parseOptionalDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function createDraftDeadlinesFromEmail(input: {
  lawFirmId: string;
  actorUserId?: string;
  emailMessageId: string;
}) {
  const email = await prisma.emailMessage.findUnique({
    where: { id: input.emailMessageId },
    include: {
      caseMatter: true,
      attachments: true
    }
  });

  if (!email || !email.caseMatterId) {
    return [];
  }

  const extraction = (email.extractionJson ?? {}) as ExtractionLike;
  const candidates = detectDeadlineCandidates({
    subject: email.subject,
    bodyText: email.bodyText,
    extraction
  });

  if (candidates.length === 0) {
    return [];
  }

  const created = [];

  for (const candidate of candidates) {
    const rule = await prisma.deadlineRule.findFirst({
      where: {
        triggerType: candidate.deadlineRuleTriggerType,
        OR: [{ lawFirmId: null }, { lawFirmId: input.lawFirmId }]
      },
      include: {
        legalRuleSource: true
      }
    });

    if (!rule) {
      continue;
    }

    const triggerDate = parseOptionalDate(extraction.serviceDate) ?? email.receivedAt;
    const serviceDate = parseOptionalDate(extraction.serviceDate) ?? email.receivedAt;
    const serviceMethod = extraction.serviceMethod ?? null;
    const sourceAttachmentId = email.attachments[0]?.id;

    const existingDraft = await prisma.draftDeadline.findFirst({
      where: {
        caseMatterId: email.caseMatterId,
        sourceEmailId: email.id,
        triggerType: candidate.triggerLabel,
        ruleSection: rule.legalRuleSource.ruleSection
      }
    });

    if (existingDraft) {
      created.push(existingDraft);
      continue;
    }

    const trigger = await prisma.deadlineTrigger.create({
      data: {
        caseMatterId: email.caseMatterId,
        sourceEmailId: email.id,
        sourceAttachmentId,
        deadlineRuleId: rule.id,
        triggerType: candidate.triggerLabel,
        triggerDate,
        serviceDate,
        serviceMethod,
        extractedFactsJson: extraction,
        confidenceScore: rule.legalRuleSource.confidenceLevel
      }
    });

    const calculation = calculateDraftDeadline({
      triggerDate,
      responseDays: rule.responseDays ?? 0,
      serviceExtensionDays: rule.serviceExtensionDays ?? 0,
      serviceMethod,
      calculationType: rule.legalRuleSource.calculationType
    });

    const draftDeadline = await prisma.draftDeadline.create({
      data: {
        caseMatterId: email.caseMatterId,
        sourceEmailId: email.id,
        sourceAttachmentId,
        triggerType: candidate.triggerLabel,
        triggerDate,
        serviceDate,
        serviceMethod,
        legalRuleSourceId: rule.legalRuleSourceId,
        ruleSection: rule.legalRuleSource.ruleSection,
        calculatedDeadlineDate: calculation.calculatedDeadlineDate,
        calculationExplanation: calculation.explanation,
        confidenceScore: rule.legalRuleSource.confidenceLevel,
        status: "ATTORNEY_REVIEW_REQUIRED"
      }
    });

    await prisma.calendarEvent.create({
      data: {
        lawFirmId: input.lawFirmId,
        caseMatterId: email.caseMatterId,
        connectedEmailAccountId: email.connectedEmailAccountId,
        draftDeadlineId: draftDeadline.id,
        title: candidate.calendarTitle,
        description: DEADLINE_WARNING,
        startsAt: calculation.calculatedDeadlineDate,
        endsAt: new Date(calculation.calculatedDeadlineDate.getTime() + 60 * 60 * 1000),
        internalOnly: true,
        status: "ATTORNEY_REVIEW_REQUIRED",
        warningLabel: "Pending attorney review",
        approvalStatus: "ATTORNEY_REVIEW_REQUIRED",
        sourceEmailId: email.id,
        sourceAttachmentId,
        legalRuleSourceId: rule.legalRuleSourceId
      }
    });

    await recordAuditLog({
      lawFirmId: input.lawFirmId,
      actorUserId: input.actorUserId,
      actionType: "DRAFT_DEADLINE_AUTO_CREATED",
      sourceEntityType: "DraftDeadline",
      sourceEntityId: draftDeadline.id,
      sourceEmailId: email.id,
      legalRuleSourceId: rule.legalRuleSourceId,
      approvalStatus: "ATTORNEY_REVIEW_REQUIRED",
      afterValue: {
        deadlineTriggerId: trigger.id,
        calculatedDeadlineDate: draftDeadline.calculatedDeadlineDate.toISOString(),
        ruleSection: draftDeadline.ruleSection
      }
    });

    created.push(draftDeadline);
  }

  return created;
}
