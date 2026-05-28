import { prisma } from "@/lib/prisma";

export type ApprovalQueueItemKind = "Deadline" | "Document" | "Calendar";

export type ApprovalQueueItem = {
  id: string;
  item: string;
  itemKind: ApprovalQueueItemKind;
  matterName: string;
  source: string;
  rule: string;
  rawStatus: string;
  statusLabel: string;
  statusTone: "warning" | "success" | "danger";
  targetType: "DRAFT_DEADLINE" | "CASE_DOCUMENT_VERSION" | "CALENDAR_EVENT";
  availableDecisions: ReadonlyArray<
    "ATTORNEY_APPROVED" | "REJECTED" | "NEEDS_CORRECTION" | "LOCKED_FOR_COURT_USE"
  >;
};

type ApprovalDeadlineRow = {
  id: string;
  triggerType: string;
  status: string;
  ruleSection: string | null;
  caseMatter: { name: string };
  sourceEmail: { subject: string } | null;
  sourceAttachment: { fileName: string } | null;
  legalRuleSource: { ruleSection: string } | null;
};

type ApprovalDocumentRow = {
  id: string;
  versionNumber: number;
  status: string;
  document: {
    name: string;
    caseMatter: { name: string };
  };
  legalRuleSources: Array<{ ruleSection: string }>;
};

type ApprovalCalendarRow = {
  id: string;
  title: string;
  warningLabel: string | null;
  approvalStatus: string;
  caseMatter: { name: string } | null;
};

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toneForStatus(status: string): ApprovalQueueItem["statusTone"] {
  if (status.includes("REJECTED") || status.includes("NEEDS_CORRECTION")) {
    return "danger";
  }

  if (status.includes("APPROVED") || status.includes("LOCKED")) {
    return "success";
  }

  return "warning";
}

export async function getApprovalQueueItems(lawFirmId: string): Promise<ApprovalQueueItem[]> {
  const [deadlineItems, documentItems, calendarItems] = await Promise.all([
    prisma.draftDeadline.findMany({
      where: {
        caseMatter: { lawFirmId },
        status: { in: ["AUTO_DETECTED", "ATTORNEY_REVIEW_REQUIRED"] }
      },
      select: {
        id: true,
        triggerType: true,
        status: true,
        ruleSection: true,
        caseMatter: { select: { name: true } },
        sourceEmail: { select: { subject: true } },
        sourceAttachment: { select: { fileName: true } },
        legalRuleSource: { select: { ruleSection: true } }
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 15
    }),
    prisma.caseDocumentVersion.findMany({
      where: {
        document: { caseMatter: { lawFirmId } },
        status: { in: ["AI_DRAFT", "ATTORNEY_REVIEW_REQUIRED", "REJECTED"] }
      },
      select: {
        id: true,
        versionNumber: true,
        status: true,
        document: {
          select: {
            name: true,
            caseMatter: { select: { name: true } }
          }
        },
        legalRuleSources: {
          select: { ruleSection: true }
        }
      },
      orderBy: [{ createdAt: "desc" }],
      take: 15
    }),
    prisma.calendarEvent.findMany({
      where: {
        lawFirmId,
        approvalStatus: { in: ["ATTORNEY_REVIEW_REQUIRED", "NEEDS_CORRECTION", "REJECTED"] }
      },
      select: {
        id: true,
        title: true,
        warningLabel: true,
        approvalStatus: true,
        caseMatter: { select: { name: true } }
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 15
    })
  ]);

  const rows: ApprovalQueueItem[] = [
    ...deadlineItems.map((item: ApprovalDeadlineRow) => ({
      id: item.id,
      item: `Draft Deadline · ${item.triggerType}`,
      itemKind: "Deadline" as const,
      matterName: item.caseMatter.name,
      source: item.sourceAttachment?.fileName ?? item.sourceEmail?.subject ?? item.caseMatter.name,
      rule: item.ruleSection ?? item.legalRuleSource?.ruleSection ?? "Verified rule source linked",
      rawStatus: item.status,
      statusLabel: formatStatus(item.status),
      statusTone: toneForStatus(item.status),
      targetType: "DRAFT_DEADLINE" as const,
      availableDecisions: ["ATTORNEY_APPROVED", "REJECTED", "NEEDS_CORRECTION"] as const
    })),
    ...documentItems.map((item: ApprovalDocumentRow) => ({
      id: item.id,
      item: `${item.document.name} · v${item.versionNumber}`,
      itemKind: "Document" as const,
      matterName: item.document.caseMatter.name,
      source: item.document.caseMatter.name,
      rule:
        item.legalRuleSources.map((rule: { ruleSection: string }) => rule.ruleSection).filter(Boolean).join(", ") ||
        "Verified source links only",
      rawStatus: item.status,
      statusLabel: formatStatus(item.status),
      statusTone: toneForStatus(item.status),
      targetType: "CASE_DOCUMENT_VERSION" as const,
      availableDecisions: ["ATTORNEY_APPROVED", "REJECTED", "NEEDS_CORRECTION", "LOCKED_FOR_COURT_USE"] as const
    })),
    ...calendarItems.map((item: ApprovalCalendarRow) => ({
      id: item.id,
      item: `Calendar Event · ${item.title}`,
      itemKind: "Calendar" as const,
      matterName: item.caseMatter?.name ?? "Unassigned matter",
      source: item.caseMatter?.name ?? "Internal calendar event",
      rule: item.warningLabel ?? "Attorney approval required before external sync",
      rawStatus: item.approvalStatus,
      statusLabel: formatStatus(item.approvalStatus),
      statusTone: toneForStatus(item.approvalStatus),
      targetType: "CALENDAR_EVENT" as const,
      availableDecisions: ["ATTORNEY_APPROVED", "REJECTED", "NEEDS_CORRECTION"] as const
    }))
  ];

  return rows.slice(0, 30);
}
