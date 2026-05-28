import { prisma } from "@/lib/prisma";

export async function listVerifiedRules(lawFirmId?: string) {
  return prisma.legalRuleSource.findMany({
    where: {
      OR: [{ lawFirmId: null }, { lawFirmId }],
      attorneyVerified: true
    },
    orderBy: [{ jurisdiction: "asc" }, { sourceName: "asc" }, { ruleSection: "asc" }]
  });
}

export async function getRuleSourceBySection(ruleSection: string, lawFirmId?: string) {
  return prisma.legalRuleSource.findFirst({
    where: {
      ruleSection,
      OR: [{ lawFirmId: null }, { lawFirmId }]
    }
  });
}

export async function getVerifiedDeadlineRuleByTrigger(triggerType: string, lawFirmId?: string) {
  return prisma.deadlineRule.findFirst({
    where: {
      triggerType,
      OR: [{ lawFirmId: null }, { lawFirmId }]
    },
    include: {
      legalRuleSource: true
    }
  });
}
