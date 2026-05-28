import { prisma } from "@/lib/prisma";

type ExtractionLike = {
  possibleDeadlineTriggers?: string[];
};

type InboxReviewItem = {
  id: string;
  subject: string;
  from: string;
  caseMatch: string;
  confidence: string;
  trigger: string;
  statusLabel: string;
  statusTone: "warning";
};

type InboxReviewEmailRow = {
  id: string;
  subject: string;
  fromAddress: string;
  extractionJson: unknown;
  reviewStatus: string;
  classificationScore: number | null;
  caseMatter: {
    name: string;
  } | null;
};

export async function getInboxReviewItems(lawFirmId: string) {
  const emails = await prisma.emailMessage.findMany({
    where: { lawFirmId },
    select: {
      id: true,
      subject: true,
      fromAddress: true,
      extractionJson: true,
      reviewStatus: true,
      classificationScore: true,
      caseMatter: {
        select: {
          name: true
        }
      }
    },
    orderBy: [{ receivedAt: "desc" }],
    take: 25
  });

  return emails.map((email: InboxReviewEmailRow): InboxReviewItem => {
    const extraction = (email.extractionJson ?? {}) as ExtractionLike;
    const trigger = extraction.possibleDeadlineTriggers?.[0] ?? "No trigger detected";
    const isManual = email.reviewStatus === "UNASSIGNED";

    return {
      id: email.id,
      subject: email.subject,
      from: email.fromAddress,
      caseMatch: email.caseMatter?.name ?? "Manual review required",
      confidence: email.classificationScore !== null && email.classificationScore !== undefined
        ? email.classificationScore.toFixed(2)
        : "0.00",
      trigger,
      statusLabel: isManual ? "Manual Assignment Needed" : "Attorney Review Required",
      statusTone: "warning" as const
    };
  });
}
