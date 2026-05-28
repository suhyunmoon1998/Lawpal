type MatchCaseInput = {
  knownCases: Array<{
    id: string;
    caseNumber?: string | null;
    name: string;
    aliases: string[];
    courtName?: string | null;
  }>;
  subject: string;
  bodyText?: string | null;
  attachmentNames?: string[];
};

export function matchCaseFromEmail(input: MatchCaseInput) {
  const haystack = [
    input.subject,
    input.bodyText ?? "",
    ...(input.attachmentNames ?? [])
  ].join(" ");

  const scored = input.knownCases.map((caseItem) => {
    let score = 0;

    if (caseItem.caseNumber && haystack.includes(caseItem.caseNumber)) score += 0.6;
    if (caseItem.courtName && haystack.toLowerCase().includes(caseItem.courtName.toLowerCase())) score += 0.15;
    if (haystack.toLowerCase().includes(caseItem.name.toLowerCase())) score += 0.2;
    if (caseItem.aliases.some((alias) => haystack.toLowerCase().includes(alias.toLowerCase()))) score += 0.15;

    return { id: caseItem.id, score: Math.min(score, 0.99) };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];

  return {
    caseMatterId: best?.score && best.score >= 0.7 ? best.id : null,
    confidenceScore: best?.score ?? 0,
    requiresManualAssignment: !best || best.score < 0.7
  };
}
