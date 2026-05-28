import { PrismaClient } from "@prisma/client";
import { LIVING_DOCUMENT_TYPES } from "../src/lib/constants";
import { encryptSecret } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function main() {
  const firm = await prisma.lawFirm.upsert({
    where: { slug: "rivera-chen-law" },
    update: {},
    create: {
      name: "Rivera Chen LLP",
      slug: "rivera-chen-law"
    }
  });

  const attorney = await prisma.user.upsert({
    where: { email: "attorney@riverachenlaw.com" },
    update: {},
    create: {
      lawFirmId: firm.id,
      email: "attorney@riverachenlaw.com",
      name: "Maria Chen",
      hashedPassword: "password123",
      role: "ATTORNEY"
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@riverachenlaw.com" },
    update: {},
    create: {
      lawFirmId: firm.id,
      email: "admin@riverachenlaw.com",
      name: "Alex Rivera",
      hashedPassword: "password123",
      role: "FIRM_ADMIN"
    }
  });

  const gmail = await prisma.connectedEmailAccount.upsert({
    where: {
      provider_emailAddress: {
        provider: "GMAIL",
        emailAddress: "intake@riverachenlaw.com"
      }
    },
    update: {},
    create: {
      lawFirmId: firm.id,
      provider: "GMAIL",
      emailAddress: "intake@riverachenlaw.com",
      displayName: "Rivera Chen Intake",
      encryptedAccessToken: encryptSecret("demo-access-token"),
      encryptedRefreshToken: encryptSecret("demo-refresh-token"),
      scopes: ["gmail.readonly", "gmail.modify"],
      oauthStatus: "DISCONNECTED"
    }
  });

  const caseMatter = await prisma.caseMatter.create({
    data: {
      lawFirmId: firm.id,
      name: "Lopez v. Horizon Manufacturing",
      caseNumber: "24STCV10811",
      courtName: "Los Angeles Superior Court",
      judgeName: "Hon. Elena Ruiz",
      department: "Dept. 52",
      aliases: ["Lopez", "Horizon"],
      workspaceKey: `${firm.slug}/lopez-horizon`
    }
  });

  const rule = await prisma.legalRuleSource.create({
    data: {
      jurisdiction: "California",
      sourceName: "California Code of Civil Procedure",
      ruleSection: "CCP § 1005",
      exactText: "Verified text placeholder for motion notice timing.",
      verifiedExcerpt: "Verified excerpt placeholder for motion notice timing.",
      sourceUrl: "https://leginfo.legislature.ca.gov/",
      lastVerifiedDate: new Date("2026-05-19"),
      calculationType: "CALENDAR_DAYS",
      serviceExtensionLogic: "Apply additional days based on verified service method rules.",
      holidayAdjustmentLogic: "Move to next court day if the deadline lands on a weekend or holiday.",
      confidenceLevel: 0.92,
      attorneyVerified: true
    }
  });

  const federalRule = await prisma.legalRuleSource.create({
    data: {
      jurisdiction: "Federal",
      sourceName: "Federal Rules of Civil Procedure",
      ruleSection: "Fed. R. Civ. P. 26",
      exactText: "Verified text placeholder for discovery timing.",
      verifiedExcerpt: "Verified excerpt placeholder for discovery timing.",
      sourceUrl: "https://www.law.cornell.edu/rules/frcp/rule_26",
      lastVerifiedDate: new Date("2026-05-19"),
      calculationType: "BUSINESS_DAYS",
      serviceExtensionLogic: "No automatic service extension without verified source support.",
      holidayAdjustmentLogic: "Move to next business day if needed.",
      confidenceLevel: 0.88,
      attorneyVerified: true
    }
  });

  await prisma.deadlineRule.createMany({
    data: [
      {
        legalRuleSourceId: rule.id,
        name: "Motion opposition timing review",
        triggerType: "MOTION_OPPOSITION_DETECTED",
        responseDays: 9,
        serviceExtensionDays: 0
      },
      {
        legalRuleSourceId: federalRule.id,
        name: "Initial disclosure follow-up",
        triggerType: "INITIAL_DISCLOSURE_DETECTED",
        responseDays: 14,
        serviceExtensionDays: 0
      }
    ]
  });

  const email = await prisma.emailMessage.create({
    data: {
      lawFirmId: firm.id,
      connectedEmailAccountId: gmail.id,
      caseMatterId: caseMatter.id,
      providerMessageId: "gmail-msg-001",
      providerThreadId: "gmail-thread-001",
      subject: "Notice of motion and motion for summary judgment",
      fromAddress: "opposingcounsel@defensefirm.com",
      toAddresses: ["intake@riverachenlaw.com"],
      ccAddresses: [],
      bccAddresses: [],
      sentAt: new Date("2026-05-18T17:00:00Z"),
      receivedAt: new Date("2026-05-18T17:01:00Z"),
      bodyText: "Please see attached motion papers. Service by electronic mail.",
      reviewStatus: "ASSIGNED",
      hasAttachments: true
    }
  });

  const attachment = await prisma.emailAttachment.create({
    data: {
      emailMessageId: email.id,
      fileName: "motion-for-summary-judgment.pdf",
      mimeType: "application/pdf",
      storageKey: "demo/motion-for-summary-judgment.pdf",
      immutableOriginalRef: "s3://immutable/demo/motion-for-summary-judgment.pdf"
    }
  });

  const caseDocuments = await Promise.all(
    LIVING_DOCUMENT_TYPES.map((name) =>
      prisma.caseDocument.create({
        data: {
          caseMatterId: caseMatter.id,
          name,
          documentType: name
        }
      })
    )
  );

  await prisma.caseDocumentVersion.create({
    data: {
      documentId: caseDocuments[0].id,
      versionNumber: 1,
      content:
        "Draft generated from case emails, attachments, and verified rule sources. Not approved for filing, service, or court use until reviewed and approved by an attorney.\n\nSummary of latest case posture.",
      generatedFromEmailIds: [email.id],
      generatedFromAttachmentIds: [attachment.id],
      changeSummary: "Created initial case status summary draft.",
      status: "ATTORNEY_REVIEW_REQUIRED",
      legalRuleSources: {
        connect: [{ id: rule.id }]
      }
    }
  });

  await prisma.draftDeadline.create({
    data: {
      caseMatterId: caseMatter.id,
      sourceEmailId: email.id,
      sourceAttachmentId: attachment.id,
      triggerType: "Motion service detected",
      triggerDate: new Date("2026-05-18"),
      serviceDate: new Date("2026-05-18"),
      serviceMethod: "Electronic Service",
      legalRuleSourceId: rule.id,
      ruleSection: "CCP § 1005",
      calculatedDeadlineDate: new Date("2026-05-27"),
      calculationExplanation: "Demo calculation based on verified source metadata.",
      confidenceScore: 0.92,
      status: "ATTORNEY_REVIEW_REQUIRED"
    }
  });

  await prisma.calendarEvent.create({
    data: {
      lawFirmId: firm.id,
      caseMatterId: caseMatter.id,
      connectedEmailAccountId: gmail.id,
      title: "Opposition due (draft)",
      description:
        "System detected a possible deadline based on the source email/document and a verified rule. Attorney approval is required before use.",
      startsAt: new Date("2026-05-27T16:00:00Z"),
      endsAt: new Date("2026-05-27T17:00:00Z"),
      internalOnly: true,
      status: "DRAFT",
      warningLabel: "Pending attorney review",
      approvalStatus: "ATTORNEY_REVIEW_REQUIRED",
      sourceEmailId: email.id,
      sourceAttachmentId: attachment.id,
      legalRuleSourceId: rule.id
    }
  });

  await prisma.task.createMany({
    data: [
      {
        lawFirmId: firm.id,
        caseMatterId: caseMatter.id,
        ownerUserId: attorney.id,
        title: "Review detected motion deadline",
        description: "Confirm service method and approve or correct the draft deadline."
      },
      {
        lawFirmId: firm.id,
        caseMatterId: caseMatter.id,
        ownerUserId: admin.id,
        title: "Confirm Gmail sync settings",
        description: "Validate least-privilege scopes and retention controls."
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
