import { prisma } from "@/lib/prisma";
import { LIVING_DOCUMENT_TYPES } from "@/lib/constants";
import { createDraftDocumentVersion } from "@/services/document-versioning.service";

type EmailExtractionLike = {
  court?: string;
  caseNumber?: string;
  serviceDate?: string;
  serviceMethod?: string;
  recommendedActions?: string[];
};

type MinimalCaseDocument = {
  documentType: string;
};

type MinimalDeadline = {
  id: string;
  triggerType: string;
  calculatedDeadlineDate: Date;
  ruleSection: string | null;
  status: string;
  legalRuleSourceId: string | null;
};

type MinimalAttachment = {
  id: string;
  fileName: string;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Unknown date";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function renderBulletList(items: string[]) {
  if (items.length === 0) {
    return "- No new entries from this source email.\n";
  }

  return `${items.map((item) => `- ${item}`).join("\n")}\n`;
}

function buildDocumentSection(input: {
  documentType: (typeof LIVING_DOCUMENT_TYPES)[number];
  caseMatter: {
    name: string;
    caseNumber: string | null;
    courtName: string | null;
    judgeName: string | null;
    department: string | null;
  };
  email: {
    id: string;
    subject: string;
    fromAddress: string;
    receivedAt: Date;
    bodyText: string | null;
    extractionJson: unknown;
    attachments: Array<{ id: string; fileName: string }>;
    draftDeadlines: Array<{
      id: string;
      triggerType: string;
      calculatedDeadlineDate: Date;
      ruleSection: string | null;
      status: string;
    }>;
  };
}) {
  const extraction = (input.email.extractionJson ?? {}) as EmailExtractionLike;
  const header = [
    `Case: ${input.caseMatter.name}`,
    input.caseMatter.caseNumber ? `Case Number: ${input.caseMatter.caseNumber}` : null,
    input.caseMatter.courtName ? `Court: ${input.caseMatter.courtName}` : null,
    input.caseMatter.judgeName ? `Judge: ${input.caseMatter.judgeName}` : null,
    input.caseMatter.department ? `Department: ${input.caseMatter.department}` : null,
    `Source Email Subject: ${input.email.subject}`,
    `Source Email From: ${input.email.fromAddress}`,
    `Source Email Received: ${formatDate(input.email.receivedAt)}`
  ]
    .filter(Boolean)
    .join("\n");

  const attachmentLine =
    input.email.attachments.length > 0
      ? `Attachments: ${input.email.attachments.map((attachment) => attachment.fileName).join(", ")}`
      : "Attachments: None detected";

  const deadlineLines = input.email.draftDeadlines.map(
    (deadline) =>
      `${deadline.triggerType} -> ${formatDate(deadline.calculatedDeadlineDate)} (${deadline.ruleSection ?? "Verified rule source pending label"}) [${deadline.status}]`
  );

  const sections: Record<(typeof LIVING_DOCUMENT_TYPES)[number], string> = {
    "Case Status Summary": [
      header,
      attachmentLine,
      "",
      "New Case Status Entry",
      renderBulletList([
        `A new source email was imported for review on ${formatDate(input.email.receivedAt)}.`,
        extraction.court ? `Referenced court information: ${extraction.court}.` : "",
        extraction.caseNumber ? `Referenced case number: ${extraction.caseNumber}.` : "",
        input.email.bodyText ? `Body summary excerpt: ${input.email.bodyText.slice(0, 320)}.` : "",
        deadlineLines.length > 0
          ? `Possible deadlines were detected and remain subject to attorney approval: ${deadlineLines.join("; ")}.`
          : "No verified deadline draft was generated from this email."
      ].filter(Boolean))
    ].join("\n"),
    "Procedural History": [
      header,
      attachmentLine,
      "",
      "Procedural History Update",
      renderBulletList([
        `${formatDate(input.email.receivedAt)}: Imported email "${input.email.subject}" from ${input.email.fromAddress}.`,
        extraction.serviceDate
          ? `Possible service date identified: ${formatDate(extraction.serviceDate)} via ${extraction.serviceMethod ?? "unknown method"}.`
          : "",
        input.email.attachments.length > 0
          ? `Supporting documents preserved: ${input.email.attachments.map((attachment) => attachment.fileName).join(", ")}.`
          : ""
      ].filter(Boolean))
    ].join("\n"),
    "Discovery Timeline": [
      header,
      attachmentLine,
      "",
      "Discovery Timeline Update",
      renderBulletList([
        /discovery|rule 26|meet and confer/i.test(`${input.email.subject}\n${input.email.bodyText ?? ""}`)
          ? `Discovery-related communication detected from ${input.email.fromAddress} on ${formatDate(input.email.receivedAt)}.`
          : "No explicit discovery event detected, but the email remains preserved for timeline review.",
        extraction.recommendedActions?.length
          ? `Recommended next steps: ${extraction.recommendedActions.join("; ")}.`
          : ""
      ].filter(Boolean))
    ].join("\n"),
    "Deadline Report": [
      header,
      attachmentLine,
      "",
      "Deadline Report Update",
      renderBulletList(
        deadlineLines.length > 0
          ? deadlineLines.map(
              (line) =>
                `Possible deadline detected: ${line}. System detected a possible deadline based on the source email/document and a verified rule. Attorney approval is required before use.`
            )
          : ["No new verified-source draft deadline was added from this email."]
      )
    ].join("\n"),
    "Meet-and-Confer History": [
      header,
      attachmentLine,
      "",
      "Meet-and-Confer Entry",
      renderBulletList([
        /meet and confer/i.test(`${input.email.subject}\n${input.email.bodyText ?? ""}`)
          ? `Potential meet-and-confer communication captured on ${formatDate(input.email.receivedAt)}.`
          : "No explicit meet-and-confer language detected; preserved for attorney review."
      ])
    ].join("\n"),
    "Court Filing and Hearing Log": [
      header,
      attachmentLine,
      "",
      "Filing / Hearing Log Entry",
      renderBulletList([
        /hearing|filed|filing|motion|conference/i.test(`${input.email.subject}\n${input.email.bodyText ?? ""}`)
          ? `Court-related activity may have occurred based on the imported communication dated ${formatDate(input.email.receivedAt)}.`
          : "No clear filing or hearing event identified automatically."
      ])
    ].join("\n"),
    "Draft Declaration Timeline": [
      header,
      attachmentLine,
      "",
      "Draft Declaration Timeline Entry",
      renderBulletList([
        `Source email and preserved attachments are available for potential declaration chronology development.`,
        extraction.serviceDate
          ? `Possible declaration timeline anchor: service date ${formatDate(extraction.serviceDate)}.`
          : ""
      ].filter(Boolean))
    ].join("\n"),
    "Potential Motion Outline": [
      header,
      attachmentLine,
      "",
      "Potential Motion Outline Update",
      renderBulletList([
        /motion|opposition|reply|summary judgment/i.test(`${input.email.subject}\n${input.email.bodyText ?? ""}`)
          ? `Motion-related content detected; this draft entry should be reviewed for argument chronology and briefing deadlines.`
          : "No clear motion-outline content detected from this source email."
      ])
    ].join("\n")
  };

  return sections[input.documentType];
}

export async function ensureLivingCaseDocuments(caseMatterId: string) {
  const existing = await prisma.caseDocument.findMany({
    where: { caseMatterId }
  });

  const missing = LIVING_DOCUMENT_TYPES.filter(
    (documentType) =>
      !existing.some((document: MinimalCaseDocument) => document.documentType === documentType)
  );

  if (missing.length > 0) {
    await prisma.caseDocument.createMany({
      data: missing.map((documentType) => ({
        caseMatterId,
        name: documentType,
        documentType
      }))
    });
  }

  return prisma.caseDocument.findMany({
    where: { caseMatterId },
    orderBy: { createdAt: "asc" }
  });
}

export async function updateLivingCaseDocumentsFromEmail(input: {
  lawFirmId: string;
  actorUserId?: string;
  emailMessageId: string;
}) {
  const email = await prisma.emailMessage.findUnique({
    where: { id: input.emailMessageId },
    include: {
      caseMatter: true,
      attachments: true,
      draftDeadlines: true
    }
  });

  if (!email?.caseMatterId || !email.caseMatter) {
    return [];
  }

  const documents = await ensureLivingCaseDocuments(email.caseMatterId);
  const legalRuleSourceIds = Array.from(
    new Set(
      email.draftDeadlines
        .map((deadline: MinimalDeadline) => deadline.legalRuleSourceId)
        .filter(Boolean) as string[]
    )
  );

  const createdVersions = [];

  for (const document of documents) {
    const latestVersion = await prisma.caseDocumentVersion.findFirst({
      where: { documentId: document.id },
      orderBy: { versionNumber: "desc" }
    });

    if (latestVersion?.generatedFromEmailIds.includes(email.id)) {
      continue;
    }

    const content = buildDocumentSection({
      documentType: document.documentType as (typeof LIVING_DOCUMENT_TYPES)[number],
      caseMatter: {
        name: email.caseMatter.name,
        caseNumber: email.caseMatter.caseNumber,
        courtName: email.caseMatter.courtName,
        judgeName: email.caseMatter.judgeName,
        department: email.caseMatter.department
      },
      email: {
        id: email.id,
        subject: email.subject,
        fromAddress: email.fromAddress,
        receivedAt: email.receivedAt,
        bodyText: email.bodyText,
        extractionJson: email.extractionJson,
        attachments: email.attachments.map((attachment: MinimalAttachment) => ({
          id: attachment.id,
          fileName: attachment.fileName
        })),
        draftDeadlines: email.draftDeadlines.map((deadline: MinimalDeadline) => ({
          id: deadline.id,
          triggerType: deadline.triggerType,
          calculatedDeadlineDate: deadline.calculatedDeadlineDate,
          ruleSection: deadline.ruleSection,
          status: deadline.status
        }))
      }
    });

    const version = await createDraftDocumentVersion({
      documentId: document.id,
      content,
      generatedFromEmailIds: [email.id],
      generatedFromAttachmentIds: email.attachments.map((attachment: MinimalAttachment) => attachment.id),
      legalRuleSourceIds,
      changeSummary: `Auto-updated ${document.documentType} from imported email "${email.subject}".`,
      actorUserId: input.actorUserId,
      lawFirmId: input.lawFirmId
    });

    createdVersions.push(version);
  }

  return createdVersions;
}
