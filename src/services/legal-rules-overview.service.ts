import { prisma } from "@/lib/prisma";
import { importScaffoldSteps, sourceRegistry, type CoverageStatus, type SourceFamily } from "@/lib/us-legal-source-registry";

function toneFromCoverageStatus(status: CoverageStatus) {
  if (status === "VERIFIED_ACTIVE") return "success" as const;
  if (status === "SEEDED_STRUCTURE") return "warning" as const;
  return "danger" as const;
}

function labelFromCoverageStatus(status: CoverageStatus) {
  if (status === "VERIFIED_ACTIVE") return "Verified Active";
  if (status === "SEEDED_STRUCTURE") return "Structure Ready";
  return "Planned";
}

export async function getLegalRulesOverview(lawFirmId?: string) {
  const verifiedRules = await prisma.legalRuleSource.findMany({
    where: {
      attorneyVerified: true,
      OR: [{ lawFirmId: null }, { lawFirmId }]
    },
    orderBy: [{ jurisdiction: "asc" }, { sourceName: "asc" }, { ruleSection: "asc" }]
  });

  const countsByFamily = sourceRegistry.reduce<Record<SourceFamily, number>>(
    (acc, entry) => {
      acc[entry.sourceFamily] += 1;
      return acc;
    },
    {
      FEDERAL: 0,
      STATE: 0,
      LOCAL: 0,
      PROVIDER: 0
    }
  );

  const countsByStatus = sourceRegistry.reduce<Record<CoverageStatus, number>>(
    (acc, entry) => {
      acc[entry.status] += 1;
      return acc;
    },
    {
      VERIFIED_ACTIVE: 0,
      SEEDED_STRUCTURE: 0,
      PLANNED: 0
    }
  );

  return {
    verifiedRules,
    summary: {
      verifiedRuleCount: verifiedRules.length,
      totalCoveragePacks: sourceRegistry.length,
      federalPacks: countsByFamily.FEDERAL,
      statePacks: countsByFamily.STATE,
      localPacks: countsByFamily.LOCAL,
      providerPacks: countsByFamily.PROVIDER,
      verifiedActivePacks: countsByStatus.VERIFIED_ACTIVE,
      structuredPacks: countsByStatus.SEEDED_STRUCTURE,
      plannedPacks: countsByStatus.PLANNED
    },
    groupedCoverage: {
      federal: sourceRegistry.filter((entry) => entry.sourceFamily === "FEDERAL"),
      local: sourceRegistry.filter((entry) => entry.sourceFamily === "LOCAL"),
      provider: sourceRegistry.filter((entry) => entry.sourceFamily === "PROVIDER"),
      states: sourceRegistry.filter((entry) => entry.sourceFamily === "STATE")
    },
    importScaffold: importScaffoldSteps.map((step, index) => ({
      ...step,
      sequence: index + 1
    })),
    helpers: {
      toneFromCoverageStatus,
      labelFromCoverageStatus
    }
  };
}
