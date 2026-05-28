import { prisma } from "@/lib/prisma";
import { DEADLINE_WARNING } from "@/lib/constants";

type DeadlineReviewRow = {
  id: string;
  triggerType: string;
  calculatedDeadlineDate: Date;
  serviceMethod: string | null;
  status: string;
  ruleSection: string | null;
  caseMatter: {
    name: string;
  };
  legalRuleSource: {
    sourceName: string;
    ruleSection: string;
  } | null;
  sourceEmail: {
    subject: string;
  } | null;
  sourceAttachment: {
    fileName: string;
  } | null;
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

export async function getDeadlineReviewItems(lawFirmId: string) {
  const deadlines = await prisma.draftDeadline.findMany({
    where: {
      caseMatter: { lawFirmId }
    },
    select: {
      id: true,
      triggerType: true,
      calculatedDeadlineDate: true,
      serviceMethod: true,
      status: true,
      ruleSection: true,
      caseMatter: {
        select: {
          name: true
        }
      },
      legalRuleSource: {
        select: {
          sourceName: true,
          ruleSection: true
        }
      },
      sourceEmail: {
        select: {
          subject: true
        }
      },
      sourceAttachment: {
        select: {
          fileName: true
        }
      }
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 50
  });

  return deadlines.map((deadline: DeadlineReviewRow) => ({
    id: deadline.id,
    caseName: deadline.caseMatter.name,
    title: deadline.triggerType,
    dueDate: formatDate(deadline.calculatedDeadlineDate),
    rule: deadline.ruleSection ?? deadline.legalRuleSource?.ruleSection ?? "Verified rule pending display label",
    source:
      deadline.sourceAttachment?.fileName ??
      deadline.sourceEmail?.subject ??
      "Source email or attachment preserved in case file",
    serviceMethod: deadline.serviceMethod ?? "Service method not yet confirmed",
    status: formatStatus(deadline.status),
    warning: DEADLINE_WARNING
  }));
}
