import { prisma } from "@/lib/prisma";
import { buildSimpleLineDiff } from "@/services/document-diff";

type DocumentListRow = {
  id: string;
  name: string;
  caseMatter: {
    name: string;
  };
  versions: Array<{
    versionNumber: number;
    generatedFromEmailIds: string[];
    generatedFromAttachmentIds: string[];
    status: string;
  }>;
};

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function getDocumentListItems(lawFirmId: string) {
  const documents = await prisma.caseDocument.findMany({
    where: {
      caseMatter: { lawFirmId }
    },
    select: {
      id: true,
      name: true,
      caseMatter: {
        select: { name: true }
      },
      versions: {
        select: {
          versionNumber: true,
          generatedFromEmailIds: true,
          generatedFromAttachmentIds: true,
          status: true
        },
        orderBy: { versionNumber: "desc" },
        take: 1
      }
    },
    orderBy: [{ updatedAt: "desc" }]
  });

  return documents.map((document: DocumentListRow) => {
    const latest = document.versions[0];

    return {
      id: document.id,
      name: document.name,
      caseName: document.caseMatter.name,
      latestVersionNumber: latest?.versionNumber ?? 0,
      generatedFromSummary: latest
        ? `${latest.generatedFromEmailIds.length} emails, ${latest.generatedFromAttachmentIds.length} attachments`
        : "No generated sources yet",
      status: latest ? formatStatus(latest.status) : "No Draft Yet",
      compareHref: `/documents/compare?documentId=${document.id}`
    };
  });
}

export async function getDocumentCompareData(lawFirmId: string, documentId?: string) {
  const document = documentId
    ? await prisma.caseDocument.findFirst({
        where: {
          id: documentId,
          caseMatter: { lawFirmId }
        },
        select: {
          id: true,
          name: true,
          caseMatter: { select: { name: true } },
          versions: {
            select: {
              id: true,
              versionNumber: true,
              status: true,
              content: true,
              generatedFromEmailIds: true,
              generatedFromAttachmentIds: true,
              changeSummary: true,
              legalRuleSources: {
                select: { ruleSection: true }
              },
              changeLogs: {
                select: {
                  generatedAt: true
                },
                orderBy: { generatedAt: "desc" },
                take: 1
              }
            },
            orderBy: { versionNumber: "desc" },
            take: 2
          }
        }
      })
    : await prisma.caseDocument.findFirst({
        where: {
          caseMatter: { lawFirmId }
        },
        select: {
          id: true,
          name: true,
          caseMatter: { select: { name: true } },
          versions: {
            select: {
              id: true,
              versionNumber: true,
              status: true,
              content: true,
              generatedFromEmailIds: true,
              generatedFromAttachmentIds: true,
              changeSummary: true,
              legalRuleSources: {
                select: { ruleSection: true }
              },
              changeLogs: {
                select: {
                  generatedAt: true
                },
                orderBy: { generatedAt: "desc" },
                take: 1
              }
            },
            orderBy: { versionNumber: "desc" },
            take: 2
          }
        },
        orderBy: { updatedAt: "desc" }
      });

  if (!document) {
    return null;
  }

  const currentVersion = document.versions[0] ?? null;
  const previousVersion = document.versions[1] ?? null;

  return {
    documentId: document.id,
    documentName: document.name,
    caseName: document.caseMatter.name,
    currentVersion: currentVersion
      ? {
          id: currentVersion.id,
          versionNumber: currentVersion.versionNumber,
          status: formatStatus(currentVersion.status),
          content: currentVersion.content,
          generatedFromEmailIds: currentVersion.generatedFromEmailIds,
          generatedFromAttachmentIds: currentVersion.generatedFromAttachmentIds,
          legalRules: currentVersion.legalRuleSources
            .map((rule: { ruleSection: string }) => rule.ruleSection)
            .filter(Boolean),
          changeSummary: currentVersion.changeSummary
        }
      : null,
    previousVersion: previousVersion
      ? {
          id: previousVersion.id,
          versionNumber: previousVersion.versionNumber,
          status: formatStatus(previousVersion.status),
          content: previousVersion.content
        }
      : null,
    diffLines: currentVersion
      ? buildSimpleLineDiff(previousVersion?.content ?? "", currentVersion.content)
      : []
  };
}
