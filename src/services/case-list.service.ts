import { prisma } from "@/lib/prisma";
import { DRAFT_WARNING } from "@/lib/constants";

type MatterStatus = "ACTIVE" | "PENDING" | "ARCHIVED" | "CLOSED";

type CaseListMatterRow = {
  id: string;
  name: string;
  caseNumber: string | null;
  courtName: string | null;
  judgeName: string | null;
  department: string | null;
  status: MatterStatus;
  _count: {
    emailMessages: number;
    draftDeadlines: number;
    documents: number;
  };
};

function formatStatus(status: MatterStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export async function getCaseListItems(lawFirmId: string) {
  const matters = await prisma.caseMatter.findMany({
    where: { lawFirmId },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      _count: {
        select: {
          emailMessages: true,
          draftDeadlines: true,
          documents: true
        }
      }
    }
  });

  return matters.map((matter: CaseListMatterRow) => ({
    id: matter.id,
    name: matter.name,
    caseNumber: matter.caseNumber ?? "No case number",
    court: matter.courtName ?? "Court not yet identified",
    judge: matter.judgeName ?? "Judge not yet identified",
    department: matter.department ?? "Department not yet identified",
    status: matter.status,
    statusLabel: formatStatus(matter.status),
    emailCount: matter._count.emailMessages,
    deadlineCount: matter._count.draftDeadlines,
    documentCount: matter._count.documents,
    warning: DRAFT_WARNING
  }));
}
