import { prisma } from "@/lib/prisma";

export type PostApprovalActionItem =
  | {
      id: string;
      type: "CALENDAR_PUSH";
      title: string;
      matterName: string;
      statusLabel: string;
      actionLabel: string;
      calendarEventId: string;
    }
  | {
      id: string;
      type: "DOCUMENT_EXPORT";
      title: string;
      matterName: string;
      statusLabel: string;
      actionLabel: string;
      documentVersionId: string;
      exportFormats: Array<"docx" | "pdf">;
    };

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function getPostApprovalActionItems(lawFirmId: string): Promise<PostApprovalActionItem[]> {
  const [calendarItems, documentItems] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        lawFirmId,
        approvalStatus: "ATTORNEY_APPROVED",
        status: "APPROVED_INTERNAL",
        internalOnly: true
      },
      include: {
        caseMatter: {
          select: { name: true }
        }
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 10
    }),
    prisma.caseDocumentVersion.findMany({
      where: {
        document: { caseMatter: { lawFirmId } },
        status: { in: ["ATTORNEY_APPROVED", "LOCKED_FOR_COURT_USE"] }
      },
      include: {
        document: {
          include: {
            caseMatter: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: [{ approvedAt: "desc" }, { createdAt: "desc" }],
      take: 10
    })
  ]);

  return [
    ...calendarItems.map((item: (typeof calendarItems)[number]) => ({
      id: `calendar-${item.id}`,
      type: "CALENDAR_PUSH" as const,
      title: item.title,
      matterName: item.caseMatter?.name ?? "Internal calendar event",
      statusLabel: formatStatus(item.approvalStatus),
      actionLabel: "Push to Google Calendar",
      calendarEventId: item.id
    })),
    ...documentItems.map((item: (typeof documentItems)[number]) => ({
      id: `document-${item.id}`,
      type: "DOCUMENT_EXPORT" as const,
      title: `${item.document.name} · v${item.versionNumber}`,
      matterName: item.document.caseMatter.name,
      statusLabel: formatStatus(item.status),
      actionLabel: item.status === "LOCKED_FOR_COURT_USE" ? "Export Court-Use Version" : "Export Approved Draft",
      documentVersionId: item.id,
      exportFormats: ["docx", "pdf"] as Array<"docx" | "pdf">
    }))
  ];
}
