import { prisma } from "@/lib/prisma";
import { buildCaseWorkspacePaths } from "@/services/storage.service";

type WorkspaceDocumentRow = {
  id: string;
  name: string;
  versions: Array<{
    versionNumber: number;
    status: string;
  }>;
};

type WorkspaceDeadlineRow = {
  id: string;
  triggerType: string;
  calculatedDeadlineDate: Date;
  ruleSection: string | null;
  status: string;
  legalRuleSource: {
    ruleSection: string;
  } | null;
};

type WorkspaceEmailRow = {
  id: string;
  subject: string;
  fromAddress: string;
  receivedAt: Date;
  reviewStatus: string;
  attachments: Array<{ id: string }>;
};

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

export async function getCaseWorkspaceData(lawFirmId: string, caseId: string) {
  const matter = await prisma.caseMatter.findFirst({
    where: {
      id: caseId,
      lawFirmId
    },
    include: {
      documents: {
        include: {
          versions: {
            orderBy: { versionNumber: "desc" },
            take: 1
          }
        },
        orderBy: { name: "asc" }
      },
      draftDeadlines: {
        include: {
          legalRuleSource: {
            select: {
              ruleSection: true
            }
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 10
      },
      emailMessages: {
        include: {
          attachments: {
            select: { id: true }
          }
        },
        orderBy: { receivedAt: "desc" },
        take: 10
      }
    }
  });

  if (!matter) {
    return null;
  }

  return {
    id: matter.id,
    name: matter.name,
    caseNumber: matter.caseNumber ?? "No case number",
    courtName: matter.courtName ?? "Court not yet identified",
    judgeName: matter.judgeName ?? "Judge not yet identified",
    department: matter.department ?? "Department not yet identified",
    workspaceFolders: buildCaseWorkspacePaths(matter.workspaceKey),
    livingDocuments: matter.documents.map((document: WorkspaceDocumentRow) => ({
      id: document.id,
      name: document.name,
      latestVersionNumber: document.versions[0]?.versionNumber ?? 0,
      currentStatus: document.versions[0]?.status ? formatStatus(document.versions[0].status) : "No Draft Yet"
    })),
    recentDeadlines: matter.draftDeadlines.map((deadline: WorkspaceDeadlineRow) => ({
      id: deadline.id,
      triggerType: deadline.triggerType,
      dueDate: formatDate(deadline.calculatedDeadlineDate),
      rule: deadline.ruleSection ?? deadline.legalRuleSource?.ruleSection ?? "Verified rule source linked",
      status: formatStatus(deadline.status)
    })),
    recentEmails: matter.emailMessages.map((email: WorkspaceEmailRow) => ({
      id: email.id,
      subject: email.subject,
      fromAddress: email.fromAddress,
      receivedAt: formatDate(email.receivedAt),
      attachmentCount: email.attachments.length,
      reviewStatus: formatStatus(email.reviewStatus)
    }))
  };
}
